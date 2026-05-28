# tree-sitter-jam

[![crates.io](https://img.shields.io/crates/v/tree-sitter-jam.svg)](https://crates.io/crates/tree-sitter-jam)

Tree-sitter grammar for the [Jam](https://github.com/raphamorim/jam) programming language.

## Using from Rust

The grammar is published on crates.io as [`tree-sitter-jam`](https://crates.io/crates/tree-sitter-jam). Add it to your `Cargo.toml`:

```toml
[dependencies]
tree-sitter = "0.25"
tree-sitter-jam = "0.1"
```

Then load the language and parse Jam source:

```rust
let mut parser = tree_sitter::Parser::new();
parser.set_language(&tree_sitter_jam::LANGUAGE.into()).expect("load Jam grammar");
let tree = parser.parse("const MAX: u32 = 64;", None).unwrap();
```

Highlight queries live in [`queries/highlights.scm`](queries/highlights.scm) and are bundled into the crate via `include` in `Cargo.toml`.

## Installing in Zed

The Zed extension lives in [`editors/zed/`](editors/zed) — a language-only extension that references this grammar over git. (Install the `editors/zed/` folder, **not** the repo root: Zed sees the root `Cargo.toml` and tries to build a Rust extension, which fails.)

To install it as a local dev extension:

1. Open **Zed**.
2. Open the command palette: **`Cmd-Shift-P`**.
3. Run **`zed: install dev extension`**.
4. In the file picker, select the **`editors/zed/`** folder of this repository.

Zed reads `extension.toml`, clones the grammar from the configured repository at the pinned commit, compiles `src/parser.c`, and loads the `editors/zed/languages/jam/` config and queries.

Open any `.jam` file to confirm — syntax highlighting should kick in, and the language indicator in the bottom-right status bar should read **Jam**.

### Iterating

- After editing queries or `editors/zed/languages/jam/config.toml`, run **`zed: reload extensions`** to pick up the changes.
- If you change the grammar itself, regenerate the parser, commit and push it, then bump `rev` in `extension.toml` to the new commit before reloading.

### Troubleshooting

- View the log via the command palette → **`zed: open log`**.
- For verbose output, launch Zed from a terminal: `/Applications/Zed.app/Contents/MacOS/zed --foreground`.
