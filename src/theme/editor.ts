import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import type { ThemeName } from "./names";

/**
 * Editor palettes. Same role names on both themes so a later color
 * experiment is a value change, not a new structure.
 */
export type EditorPalette = {
  background: string;
  foreground: string;
  caret: string;
  selection: string;
  selectionMatch: string;
  lineHighlight: string;
  gutterBackground: string;
  gutterForeground: string;
  gutterActiveForeground: string;
  comment: string;
  punctuation: string;
  tag: string;
  attribute: string;
  string: string;
  number: string;
  keyword: string;
  function: string;
  property: string;
  invalid: string;
};

export const editorPalettes: Record<ThemeName, EditorPalette> = {
  light: {
    background: "#ffffff",
    foreground: "#171717",
    caret: "#171717",
    selection: "#d4d4d4",
    selectionMatch: "#e5e5e5",
    lineHighlight: "#f5f5f5",
    gutterBackground: "#ffffff",
    gutterForeground: "#737373",
    gutterActiveForeground: "#171717",
    comment: "#737373",
    punctuation: "#525252",
    tag: "#9f1239",
    attribute: "#3f6212",
    string: "#854d0e",
    number: "#6b21a8",
    keyword: "#9f1239",
    function: "#3f6212",
    property: "#155e75",
    invalid: "#9f1239",
  },
  dark: {
    background: "#282a3a",
    foreground: "#eaf2f1",
    caret: "#b2b9bd",
    selection: "#535763",
    selectionMatch: "#3a3d4b",
    lineHighlight: "#1e1f2b",
    gutterBackground: "#282a3a",
    gutterForeground: "#696d77",
    gutterActiveForeground: "#b2b9bd",
    comment: "#696d77",
    punctuation: "#b2b9bd",
    tag: "#ff657a",
    attribute: "#bad761",
    string: "#ffd76d",
    number: "#c39ac9",
    keyword: "#ff657a",
    function: "#bad761",
    property: "#9cd1bb",
    invalid: "#ff657a",
  },
};

function editorTheme(name: ThemeName) {
  const palette = editorPalettes[name];
  return createTheme({
    theme: name,
    settings: {
      background: palette.background,
      foreground: palette.foreground,
      caret: palette.caret,
      selection: palette.selection,
      selectionMatch: palette.selectionMatch,
      lineHighlight: palette.lineHighlight,
      gutterBackground: palette.gutterBackground,
      gutterForeground: palette.gutterForeground,
      gutterActiveForeground: palette.gutterActiveForeground,
      gutterBorder: "transparent",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "12px",
    },
    styles: [
      { tag: t.comment, color: palette.comment, fontStyle: "italic" },
      { tag: t.documentMeta, color: palette.comment },
      { tag: t.keyword, color: palette.keyword },
      { tag: t.controlKeyword, color: palette.keyword },
      { tag: t.operatorKeyword, color: palette.keyword },
      { tag: t.tagName, color: palette.tag },
      { tag: t.angleBracket, color: palette.punctuation },
      { tag: t.attributeName, color: palette.attribute },
      { tag: t.attributeValue, color: palette.string },
      { tag: t.string, color: palette.string },
      { tag: t.special(t.string), color: palette.string },
      { tag: t.number, color: palette.number },
      { tag: t.bool, color: palette.number },
      { tag: t.null, color: palette.number },
      { tag: t.atom, color: palette.number },
      { tag: t.definition(t.variableName), color: palette.property },
      { tag: t.function(t.variableName), color: palette.function },
      { tag: t.variableName, color: palette.foreground },
      { tag: t.propertyName, color: palette.property },
      { tag: t.className, color: palette.string },
      { tag: t.typeName, color: palette.property },
      { tag: t.operator, color: palette.keyword },
      { tag: t.punctuation, color: palette.punctuation },
      { tag: t.bracket, color: palette.punctuation },
      { tag: t.meta, color: palette.number },
      { tag: t.link, color: palette.property, textDecoration: "underline" },
      { tag: t.heading, color: palette.function },
      { tag: t.quote, color: palette.function },
      { tag: t.invalid, color: palette.invalid },
    ],
  });
}

export const editorThemes: Record<ThemeName, ReturnType<typeof editorTheme>> = {
  light: editorTheme("light"),
  dark: editorTheme("dark"),
};
