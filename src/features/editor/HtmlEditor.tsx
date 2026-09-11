import CodeMirror from "@uiw/react-codemirror";
import { html } from "@codemirror/lang-html";
import { editorThemes, useTheme } from "@/theme";

type Props = {
  value: string;
  onChange: (content: string) => void;
};

const extensions = [html()];

export function HtmlEditor({ value, onChange }: Props) {
  const { theme } = useTheme();

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={editorThemes[theme]}
      extensions={extensions}
      onChange={onChange}
      indentWithTab
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        autocompletion: false,
      }}
      className="html-editor h-full min-h-0"
      aria-label="HTML Editor"
    />
  );
}
