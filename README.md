# tree-sitter-jam

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
