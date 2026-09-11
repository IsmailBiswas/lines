use std::path::{Path, PathBuf};

use tauri::AppHandle;

use crate::error::{AppError, AppResult};
use crate::types::PdfExportItem;

/// Same CSS width the preview iframe uses (`Preview.tsx` PAGE_WIDTH).
const PAGE_WIDTH_PX: f64 = 794.0;
const PAGE_HEIGHT_PX: f64 = 1123.0;

pub fn write_pdf_bytes(bytes: &[u8], dest: &Path) -> AppResult<()> {
    if bytes.is_empty() {
        return Err(AppError::msg("The PDF was empty."));
    }
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(dest, bytes)?;
    Ok(())
}

pub fn export_html(app: &AppHandle, html: &str, dest: &Path) -> AppResult<()> {
    let bytes = render_pdf(app, html)?;
    write_pdf_bytes(&bytes, dest)
}

pub fn export_htmls(
    app: &AppHandle,
    items: &[PdfExportItem],
    dest_folder: &Path,
    resume_name: &str,
) -> AppResult<String> {
    if items.is_empty() {
        return Err(AppError::msg("Select at least one file to export."));
    }
    let packet = dest_folder.join(folder_stem(resume_name));
    std::fs::create_dir_all(&packet)?;
    for item in items {
        let dest = packet.join(pdf_file_name(&item.name));
        export_html(app, &item.html, dest.as_path())?;
    }
    Ok(packet.to_string_lossy().into_owned())
}

fn folder_stem(name: &str) -> String {
    let stem = name.trim().trim_end_matches(".pdf").trim();
    let cleaned: String = stem
        .chars()
        .filter(|ch| !matches!(ch, '/' | '\\' | ':' | '\0'))
        .collect();
    if cleaned.is_empty() {
        "export".into()
    } else {
        cleaned
    }
}

fn pdf_file_name(name: &str) -> PathBuf {
    let stem = folder_stem(name);
    PathBuf::from(format!("{stem}.pdf"))
}

fn render_pdf(app: &AppHandle, html: &str) -> AppResult<Vec<u8>> {
    #[cfg(target_os = "macos")]
    {
        macos::render(app, html)
    }
    #[cfg(not(target_os = "macos"))]
    {
        let _ = app;
        let _ = html;
        Err(AppError::msg(
            "PDF export needs the system page renderer, which is not available on this system yet.",
        ))
    }
}

#[cfg(target_os = "macos")]
mod macos {
    use std::sync::mpsc;
    use std::time::{Duration, Instant};

    use block2::RcBlock;
    use objc2::runtime::AnyObject;
    use objc2::{MainThreadMarker, MainThreadOnly};
    use objc2_app_kit::{NSBackingStoreType, NSWindow, NSWindowStyleMask};
    use objc2_core_foundation::{CGPoint, CGRect, CGSize};
    use objc2_foundation::{NSDate, NSError, NSPoint, NSRect, NSRunLoop, NSSize, NSString};
    use objc2_web_kit::{
        WKPDFConfiguration, WKWebView, WKWebViewConfiguration,
    };
    use tauri::AppHandle;

    use super::{PAGE_HEIGHT_PX, PAGE_WIDTH_PX};
    use crate::error::{AppError, AppResult};

    const MEASURE_JS: &str = r#"(function () {
  var root = document.documentElement;
  var body = document.body;
  var width = Math.max(
    root ? root.scrollWidth : 0,
    body ? body.scrollWidth : 0,
    794
  );
  var height = Math.max(
    root ? root.scrollHeight : 0,
    body ? body.scrollHeight : 0,
    1
  );
  return String(width) + "," + String(height);
})()"#;

    const FONTS_JS: &str = r#"(function () {
  if (!document.fonts || !document.fonts.ready) return "ok";
  return document.fonts.ready.then(function () { return "ok"; });
})()"#;

    pub fn render(app: &AppHandle, html: &str) -> AppResult<Vec<u8>> {
        if MainThreadMarker::new().is_some() {
            return render_on_main(html);
        }
        let (tx, rx) = mpsc::channel();
        let html = html.to_string();
        app.run_on_main_thread(move || {
            let _ = tx.send(render_on_main(&html));
        })
        .map_err(|_| AppError::msg("The PDF export could not start."))?;
        rx.recv()
            .map_err(|_| AppError::msg("The PDF export was interrupted."))?
    }

    fn render_on_main(html: &str) -> AppResult<Vec<u8>> {
        let mtm = MainThreadMarker::new()
            .ok_or_else(|| AppError::msg("The PDF could not be created from this screen."))?;

        let config = unsafe { WKWebViewConfiguration::new(mtm) };
        unsafe {
            let prefs = config.defaultWebpagePreferences();
            prefs.setAllowsContentJavaScript(false);
            config.setDefaultWebpagePreferences(Some(&prefs));
        }

        let view_frame = CGRect::new(
            CGPoint::new(0.0, 0.0),
            CGSize::new(PAGE_WIDTH_PX, PAGE_HEIGHT_PX),
        );
        let webview = unsafe {
            WKWebView::initWithFrame_configuration(WKWebView::alloc(mtm), view_frame, &config)
        };

        let window = unsafe {
            NSWindow::initWithContentRect_styleMask_backing_defer(
                NSWindow::alloc(mtm),
                NSRect::new(
                    NSPoint::new(-16000.0, 0.0),
                    NSSize::new(PAGE_WIDTH_PX, PAGE_HEIGHT_PX),
                ),
                NSWindowStyleMask::Borderless,
                NSBackingStoreType::Buffered,
                false,
            )
        };
        unsafe { window.setReleasedWhenClosed(false) };
        window.setIgnoresMouseEvents(true);
        window.setContentView(Some(&webview));
        window.orderFront(None);

        let html = NSString::from_str(&strip_active_content(html));
        unsafe {
            webview.loadHTMLString_baseURL(&html, None);
        }

        wait_until_loaded(&webview)?;
        let _ = eval_string(&webview, FONTS_JS);
        pump(0.2);

        let (css_width, css_height) = measure(&webview);
        resize(&window, &webview, css_width, css_height);
        pump(0.1);

        let bytes = create_pdf(mtm, &webview, css_width, css_height)?;
        window.close();
        Ok(bytes)
    }

    fn measure(webview: &WKWebView) -> (f64, f64) {
        match eval_string(webview, MEASURE_JS) {
            Ok(text) => {
                let mut parts = text.split(',');
                let width = parts
                    .next()
                    .and_then(|part| part.trim().parse::<f64>().ok())
                    .filter(|value| value.is_finite() && *value > 0.0)
                    .unwrap_or(PAGE_WIDTH_PX);
                let height = parts
                    .next()
                    .and_then(|part| part.trim().parse::<f64>().ok())
                    .filter(|value| value.is_finite() && *value > 0.0)
                    .unwrap_or(PAGE_HEIGHT_PX);
                (width.max(PAGE_WIDTH_PX), height)
            }
            Err(_) => (PAGE_WIDTH_PX, PAGE_HEIGHT_PX),
        }
    }

    fn resize(window: &NSWindow, webview: &WKWebView, width: f64, height: f64) {
        let width = width.max(1.0);
        let height = height.max(1.0);
        window.setContentSize(NSSize::new(width, height));
        webview.setFrame(NSRect::new(NSPoint::new(0.0, 0.0), NSSize::new(width, height)));
    }

    fn wait_until_loaded(webview: &WKWebView) -> AppResult<()> {
        let start = Instant::now();
        while unsafe { webview.isLoading() } {
            if start.elapsed() > Duration::from_secs(20) {
                return Err(AppError::msg("The document took too long to open for export."));
            }
            pump(0.05);
        }
        Ok(())
    }

    fn eval_string(webview: &WKWebView, script: &str) -> AppResult<String> {
        let (tx, rx) = mpsc::channel();
        let block = RcBlock::new(move |value: *mut AnyObject, error: *mut NSError| {
            if !error.is_null() {
                let message = unsafe { (*error).localizedDescription().to_string() };
                let _ = tx.send(Err(AppError::msg(message)));
                return;
            }
            if value.is_null() {
                let _ = tx.send(Ok(String::new()));
                return;
            }
            let text = unsafe { &*value }
                .downcast_ref::<NSString>()
                .map(NSString::to_string)
                .unwrap_or_default();
            let _ = tx.send(Ok(text));
        });
        unsafe {
            webview.evaluateJavaScript_completionHandler(
                &NSString::from_str(script),
                Some(&block),
            );
        }
        wait_channel(rx, Duration::from_secs(8))
    }

    fn create_pdf(
        mtm: MainThreadMarker,
        webview: &WKWebView,
        width: f64,
        height: f64,
    ) -> AppResult<Vec<u8>> {
        let (tx, rx) = mpsc::channel();
        let config = unsafe { WKPDFConfiguration::new(mtm) };
        unsafe {
            config.setRect(CGRect::new(
                CGPoint::new(0.0, 0.0),
                CGSize::new(width.max(1.0), height.max(1.0)),
            ));
        }
        let block = RcBlock::new(move |data: *mut objc2_foundation::NSData, error: *mut NSError| {
            if !error.is_null() {
                let message = unsafe { (*error).localizedDescription().to_string() };
                let _ = tx.send(Err(AppError::msg(message)));
                return;
            }
            if data.is_null() {
                let _ = tx.send(Err(AppError::msg("The PDF was empty.")));
                return;
            }
            let _ = tx.send(Ok(unsafe { (*data).to_vec() }));
        });
        unsafe {
            webview.createPDFWithConfiguration_completionHandler(Some(&config), &block);
        }
        wait_channel(rx, Duration::from_secs(15))
    }

    fn wait_channel<T>(rx: mpsc::Receiver<AppResult<T>>, timeout: Duration) -> AppResult<T> {
        let start = Instant::now();
        loop {
            match rx.try_recv() {
                Ok(value) => return value,
                Err(mpsc::TryRecvError::Empty) => {
                    if start.elapsed() > timeout {
                        return Err(AppError::msg("The PDF export timed out."));
                    }
                    pump(0.05);
                }
                Err(mpsc::TryRecvError::Disconnected) => {
                    return Err(AppError::msg("The PDF export was interrupted."));
                }
            }
        }
    }

    fn pump(seconds: f64) {
        NSRunLoop::currentRunLoop().runUntilDate(&NSDate::dateWithTimeIntervalSinceNow(seconds));
    }

    fn strip_active_content(html: &str) -> String {
        let mut out = html.to_string();
        for tag in ["script", "iframe", "object", "embed", "base"] {
            out = strip_tag(&out, tag);
        }
        out
    }

    fn strip_tag(html: &str, tag: &str) -> String {
        let open = format!("<{tag}");
        let close = format!("</{tag}>");
        let mut remaining = html;
        let mut out = String::with_capacity(html.len());
        loop {
            let lower = remaining.to_ascii_lowercase();
            let Some(start) = lower.find(&open) else {
                out.push_str(remaining);
                break;
            };
            out.push_str(&remaining[..start]);
            let after = &remaining[start..];
            let after_lower = &lower[start..];
            let Some(gt) = after_lower.find('>') else {
                break;
            };
            let rest = &after[gt + 1..];
            let rest_lower = rest.to_ascii_lowercase();
            remaining = match rest_lower.find(&close) {
                Some(end) => &rest[end + close.len()..],
                None => rest,
            };
        }
        out
    }
}
