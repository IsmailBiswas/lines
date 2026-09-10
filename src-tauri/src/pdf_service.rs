use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

use printpdf::{BuiltinFont, Mm, PdfDocument};

use crate::error::{AppError, AppResult};

pub fn write_pdf(html: &str, dest: &Path) -> AppResult<()> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let text = strip_tags(html);
    let (document, page, layer) = PdfDocument::new("Resume", Mm(210.0), Mm(297.0), "Layer 1");
    let font = document
        .add_builtin_font(BuiltinFont::TimesRoman)
        .map_err(|error| AppError::msg(format!("Could not write the PDF: {error}")))?;
    let current_layer = document.get_page(page).get_layer(layer);

    let mut y = 280.0;
    for line in wrap_text(&text, 92) {
        if y < 18.0 {
            break;
        }
        current_layer.use_text(line, 11.0, Mm(18.0), Mm(y), &font);
        y -= 6.0;
    }

    document
        .save(&mut BufWriter::new(File::create(dest)?))
        .map_err(|error| AppError::msg(format!("Could not write the PDF: {error}")))?;
    Ok(())
}

fn strip_tags(html: &str) -> String {
    let mut out = String::new();
    let mut in_tag = false;
    for ch in html.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            value if !in_tag => out.push(value),
            _ => {}
        }
    }
    decode_entities(&out)
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty())
        .collect::<Vec<_>>()
        .join("\n")
}

fn decode_entities(text: &str) -> String {
    text.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
}

fn wrap_text(text: &str, width: usize) -> Vec<String> {
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        let mut current = String::new();
        for word in paragraph.split_whitespace() {
            if current.is_empty() {
                current.push_str(word);
            } else if current.len() + 1 + word.len() > width {
                lines.push(current);
                current = word.to_string();
            } else {
                current.push(' ');
                current.push_str(word);
            }
        }
        if !current.is_empty() {
            lines.push(current);
        }
        lines.push(String::new());
    }
    lines
}
