/**
 * Tree-sitter grammar for the Jam programming language.
 *
 * Tracks the syntax accepted by the upstream compiler at
 * /Users/rapha/Documents/a/jam (src/parser.cpp + src/lexer.cpp). When the
 * compiler grows new forms, mirror them here and add a corpus test under
 * test/corpus/.
 */

module.exports = grammar({
  name: "jam",

  extras: $ => [
    /\s/,
    $.line_comment,
  ],

  word: $ => $.identifier,

  // Jam is ambiguity-free as a language rule (see project memory): every
  // token sequence has exactly one parse. Tree-sitter `conflicts: [...]`
  // entries would mean two rules can both match the same tokens — a
  // smell to be refactored away rather than declared. Keep this list
  // empty; encode disambiguation in the rules instead.
  conflicts: $ => [],

  supertypes: $ => [
    $._top_level_item,
    $._statement,
    $._expression,
    $._type,
    $._pattern,
  ],

  rules: {
    source_file: $ => repeat($._top_level_item),

    // ---- Comments ----------------------------------------------------------

    line_comment: $ => token(seq('//', /.*/)),

    // ---- Top-level items ---------------------------------------------------

    _top_level_item: $ => choice(
      $.import_declaration,
      $.destructuring_import_declaration,
      $.const_declaration,
      $.function_declaration,
    ),

    // `const std = import("std");`
    import_declaration: $ => seq(
      'const',
      field('name', $.identifier),
      '=',
      'import',
      '(',
      field('path', $.string_literal),
      ')',
      ';'
    ),

    // `const { a, b } = import("mod");`
    destructuring_import_declaration: $ => seq(
      'const',
      '{',
      field('names', commaSep1($.identifier)),
      optional(','),
      '}',
      '=',
      'import',
      '(',
      field('path', $.string_literal),
      ')',
      ';'
    ),

    // Module-level `const` (struct/union/enum decl, type alias, or value).
    //   const Point = struct { x: u32, y: u32 };
    //   const Op = enum { Nop, Jp(u16) };
    //   const BoxI32 = Box(i32);
    //   const KMAX: u32 = 64;
    const_declaration: $ => seq(
      'const',
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', choice(
        $.struct_definition,
        $.union_definition,
        $.enum_definition,
        $._expression
      )),
      ';'
    ),

    // ---- Type definitions (RHS of a top-level `const Name = ...`) ----------

    // Same shape as struct_expression but only valid as the RHS of a
    // top-level `const Name = ...;`. Higher precedence than the
    // expression form so `const Foo = struct { ... };` lowers to a
    // definition rather than an expression-valued struct binding.
    struct_definition: $ => prec(1, seq(
      'struct',
      '{',
      repeat($._struct_member),
      '}'
    )),

    union_definition: $ => seq(
      'union',
      '{',
      repeat(seq($.field_declaration, optional(','))),
      '}'
    ),

    enum_definition: $ => seq(
      'enum',
      '{',
      commaSep($.enum_variant),
      optional(','),
      '}'
    ),

    // Members of a struct body: a field decl or a method, each optionally
    // followed by `,`. The compiler's parser also accepts a trailing comma
    // after the last member.
    _struct_member: $ => choice(
      seq($.field_declaration, optional(',')),
      seq($.method_declaration, optional(','))
    ),

    field_declaration: $ => seq(
      field('name', $.identifier),
      ':',
      field('type', $._type)
    ),

    // Methods inside a struct body; same shape as a top-level fn.
    method_declaration: $ => $.function_declaration,

    enum_variant: $ => seq(
      field('name', $.identifier),
      optional(seq(
        '(',
        commaSep($._type),
        optional(','),
        ')'
      )),
      // Optional explicit u8 discriminant: `Variant = 5` or
      // `Variant(payload) = 5`. The compiler treats this as overriding
      // the running counter for subsequent variants.
      optional(seq('=', field('discriminant', $.number_literal)))
    ),

    // ---- Functions ---------------------------------------------------------

    function_declaration: $ => seq(
      optional(field('visibility', choice('extern', 'export', 'pub'))),
      choice('fn', 'tfn'),
      field('name', $.identifier),
      field('parameters', $.parameter_list),
      optional(field('return_type', $._type)),
      choice(
        field('body', $.block),
        ';'  // extern functions and forward decls have no body
      )
    ),

    parameter_list: $ => seq(
      '(',
      optional(seq(
        choice($.parameter, $.variadic_parameter),
        repeat(seq(',', choice($.parameter, $.variadic_parameter))),
        optional(',')
      )),
      ')'
    ),

    parameter: $ => seq(
      field('name', $.identifier),
      ':',
      optional(field('mode', $.parameter_mode)),
      field('type', $._type)
    ),

    // Modes are parser keywords sitting between `:` and the type. `let`
    // is implicit (default); only `mut` and `move` are spelled.
    parameter_mode: $ => choice('mut', 'move'),

    // `...` — only legal as the trailing parameter on an `extern fn`.
    variadic_parameter: $ => '...',

    // ---- Types -------------------------------------------------------------

    _type: $ => choice(
      $.primitive_type,
      $.pointer_type,
      $.slice_type,
      $.array_type,
      $.generic_type,
      $.named_type
    ),

    primitive_type: $ => choice(
      'u1', 'u8', 'u16', 'u32', 'u64',
      'i8', 'i16', 'i32', 'i64',
      'f32', 'f64',
      'bool', 'str',
      'type'
    ),

    // Pointer types require an explicit qualifier:
    //   *const T      — single-item, read-only pointee
    //   *mut T        — single-item, writable pointee
    //   *const[] T    — many-item (indexable), read-only
    //   *mut[] T      — many-item (indexable), writable
    //
    // Jam is ambiguity-free: the same token sequence has exactly one
    // parse. So `*const []T` is always a many-pointer to T, never a
    // single-pointer to a slice. The grammar enforces this by splitting
    // on whether the `[]` marker is present and forbidding the slice
    // form as the element of a *single*-pointer (slice can still appear
    // as a many-pointer's element since the marker has been consumed
    // first — `*const[] []T` is many-pointer-to-slice-of-T).
    pointer_type: $ => seq(
      '*',
      field('qualifier', choice('const', 'mut')),
      choice(
        seq(field('many', seq('[', ']')), field('element', $._type)),
        field('element', $._single_pointer_element)
      )
    ),

    _single_pointer_element: $ => choice(
      $.primitive_type,
      $.pointer_type,
      $.array_type,
      $.generic_type,
      $.named_type
    ),

    // `[]T` — slice (ptr + len). Element mutability follows the binding.
    slice_type: $ => seq('[', ']', field('element', $._type)),

    // `[N]T` — fixed-size array.
    array_type: $ => seq(
      '[',
      field('size', $._expression),
      ']',
      field('element', $._type)
    ),

    // `Foo(T, U)` — generic instantiation in a type position.
    generic_type: $ => prec(1, seq(
      field('name', $.identifier),
      '(',
      field('arguments', commaSep1($._type)),
      optional(','),
      ')'
    )),

    // Bare user-named type (`Point`, `Self`, `T`, ...).
    named_type: $ => $.identifier,

    // ---- Statements --------------------------------------------------------

    block: $ => seq(
      '{',
      repeat($._statement),
      '}'
    ),

    _statement: $ => choice(
      $.variable_declaration,
      $.return_statement,
      $.if_statement,
      $.while_statement,
      $.for_statement,
      $.break_statement,
      $.continue_statement,
      $.assignment_statement,
      $.expression_statement
    ),

    // `var name[: T] = expr;` and `const name[: T] = expr;`. The compiler
    // requires every binding to carry an initializer (no `undefined` form);
    // the grammar enforces the same.
    variable_declaration: $ => seq(
      field('binding', choice('const', 'var')),
      field('name', $.identifier),
      optional(seq(':', field('type', $._type))),
      '=',
      field('value', $._expression),
      ';'
    ),

    return_statement: $ => seq(
      'return',
      optional(field('value', $._expression)),
      ';'
    ),

    if_statement: $ => seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('consequence', $.block),
      optional(seq(
        'else',
        field('alternative', $.block)
      ))
    ),

    while_statement: $ => seq(
      'while',
      '(',
      field('condition', $._expression),
      ')',
      field('body', $.block)
    ),

    // `for i in start:end { ... }` — half-open range; bounds are
    // expressions, not necessarily literals.
    for_statement: $ => seq(
      'for',
      field('variable', $.identifier),
      'in',
      field('start', $._expression),
      ':',
      field('end', $._expression),
      field('body', $.block)
    ),

    break_statement: $ => seq('break', ';'),
    continue_statement: $ => seq('continue', ';'),

    assignment_statement: $ => seq(
      field('left', $._lvalue),
      '=',
      field('right', $._expression),
      ';'
    ),

    // Expressions in statement position. Block-ending expressions (today
    // just `match`; later: `if` and any other `{ ... }`-terminated form)
    // omit the trailing `;`. Mirrors tree-sitter-rust's
    // `_expression_ending_with_block` pattern.
    expression_statement: $ => choice(
      seq($._expression, ';'),
      prec(1, $._expression_ending_with_block)
    ),

    _expression_ending_with_block: $ => choice(
      $.match_expression
    ),

    // Lvalues — identifiers, member access, indexing, deref, all chained.
    _lvalue: $ => choice(
      $.identifier,
      $.member_expression,
      $.index_expression,
      $.deref_expression
    ),

    // ---- Expressions -------------------------------------------------------

    // The full expression universe = the "leaf-ending" forms plus the
    // block-ending forms. Splitting these out lets `call_expression`
    // require a non-block callee — Jam doesn't allow `match {} (x)` to
    // parse as a call, and the split removes that ambiguity at the
    // grammar level.
    _expression: $ => choice(
      $._non_block_expression,
      $._expression_ending_with_block
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    // `{ field: value, ... }` — works for structs and (single-field) unions.
    struct_literal: $ => prec(1, seq(
      '{',
      commaSep1($.struct_literal_field),
      optional(','),
      '}'
    )),

    struct_literal_field: $ => seq(
      field('name', $.identifier),
      ':',
      field('value', $._expression)
    ),

    // `[a, b, c]` and `[]` (the latter is well-typed only against a slice).
    array_literal: $ => seq(
      '[',
      optional(seq(
        commaSep1($._expression),
        optional(',')
      )),
      ']'
    ),

    // `[expr; N]` — repeat literal. N must be a constant integer at codegen.
    array_repeat_literal: $ => seq(
      '[',
      field('value', $._expression),
      ';',
      field('count', $._expression),
      ']'
    ),

    // `struct { ... }` as an expression — anonymous struct value, used as
    // the return body of a generic type-returning function.
    struct_expression: $ => seq(
      'struct',
      '{',
      repeat($._struct_member),
      '}'
    ),

    // `a.b` — also `a.*` for pointer deref (handled separately).
    member_expression: $ => prec.left(8, seq(
      field('object', $._expression),
      '.',
      field('member', $.identifier)
    )),

    index_expression: $ => prec.left(8, seq(
      field('object', $._expression),
      '[',
      field('index', $._expression),
      ']'
    )),

    // Pointer dereference — `p.*`. Distinct from member_expression because
    // the trailing token is `*`, not an identifier.
    deref_expression: $ => prec.left(8, seq(
      field('pointer', $._expression),
      '.',
      '*'
    )),

    address_of_expression: $ => prec(7, seq('&', field('value', $._expression))),

    // Jam is ambiguity-free: `match (x) {} (y)` must have exactly one
    // parse. The compiler's parsePrimary returns immediately after a
    // match-expression with no postfix chain, so a match value can't be
    // called. Encode that by restricting the callee to non-block-ending
    // forms — the tokens after a `match … }` then start the next
    // statement, never a call argument list.
    call_expression: $ => prec(8, seq(
      field('callee', $._non_block_expression),
      field('arguments', $.argument_list)
    )),

    _non_block_expression: $ => choice(
      $.number_literal,
      $.boolean_literal,
      $.string_literal,
      $.identifier,
      $.struct_literal,
      $.array_literal,
      $.array_repeat_literal,
      $.struct_expression,
      $.member_expression,
      $.index_expression,
      $.deref_expression,
      $.address_of_expression,
      $.call_expression,
      $.unary_expression,
      $.binary_expression,
      $.cast_expression,
      $.parenthesized_expression
    ),

    argument_list: $ => seq(
      '(',
      optional(seq(
        $._expression,
        repeat(seq(',', $._expression)),
        optional(',')
      )),
      ')'
    ),

    // Prefix unary: -x, !x, ~x.
    unary_expression: $ => prec(7, seq(
      field('operator', choice('-', '!', '~')),
      field('operand', $._expression)
    )),

    // `expr as Type` — explicit numeric / enum cast.
    cast_expression: $ => prec.left(6, seq(
      field('value', $._expression),
      'as',
      field('type', $._type)
    )),

    // Binary ops — precedence ladder mirrors src/parser.cpp:
    //   logical or  < logical and < bitwise/comparison < shift
    //   < addition  < multiplication.
    // Jam has no `/` (division); only `+ - * %` for arithmetic.
    binary_expression: $ => {
      const table = [
        ['or',  1],
        ['and', 2],
        ['==',  3],
        ['!=',  3],
        ['<',   3],
        ['<=',  3],
        ['>',   3],
        ['>=',  3],
        ['|',   3],
        ['^',   3],
        ['&',   3],
        ['<<',  4],
        ['>>',  4],
        ['+',   5],
        ['-',   5],
        ['*',   6],
        ['%',   6],
      ];
      return choice(...table.map(([op, p]) =>
        prec.left(p, seq(
          field('left', $._expression),
          field('operator', op),
          field('right', $._expression)
        ))
      ));
    },

    // Match — used both as a statement (no value) and as an expression
    // (value is the chosen arm's last expression).
    match_expression: $ => seq(
      'match',
      '(',
      field('scrutinee', $._expression),
      ')',
      '{',
      repeat($.match_arm),
      optional($.match_else_arm),
      '}'
    ),

    match_arm: $ => seq(
      field('pattern', $._pattern),
      field('body', $.match_arm_body)
    ),

    match_else_arm: $ => seq(
      'else',
      field('body', $.match_arm_body)
    ),

    // Match arm bodies are block-expressions: zero or more statements
    // followed by an optional trailing expression that becomes the arm's
    // value. Mirrors how the compiler's parseMatch consumes each arm body
    // as a sequence of expressions/statements terminated by `}`.
    match_arm_body: $ => seq(
      '{',
      repeat($._statement),
      optional($._expression),
      '}'
    ),

    // ---- Patterns (only inside match arms) --------------------------------

    _pattern: $ => choice(
      $.literal_pattern,
      $.range_pattern,
      $.enum_variant_pattern,
      $.wildcard_pattern,
      $.or_pattern
    ),

    literal_pattern: $ => seq(
      optional('-'),
      $.number_literal
    ),

    range_pattern: $ => seq(
      field('start', seq(optional('-'), $.number_literal)),
      '..=',
      field('end', seq(optional('-'), $.number_literal))
    ),

    // `EnumName.Variant` or `EnumName.Variant(b1, b2, ...)`.
    enum_variant_pattern: $ => seq(
      field('enum', $.identifier),
      '.',
      field('variant', $.identifier),
      optional(seq(
        '(',
        optional(seq(
          field('bindings', commaSep1($.identifier)),
          optional(',')
        )),
        ')'
      ))
    ),

    wildcard_pattern: $ => '_',

    // `A | B | C` — alternation.
    or_pattern: $ => prec.left(seq(
      $._pattern_atom,
      repeat1(seq('|', $._pattern_atom))
    )),

    _pattern_atom: $ => choice(
      $.literal_pattern,
      $.range_pattern,
      $.enum_variant_pattern,
      $.wildcard_pattern
    ),

    // ---- Literals ----------------------------------------------------------

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Numeric literal. Magnitude only — a leading unary minus is parsed
    // by unary_expression and folded by the compiler. Bases mirror the
    // compiler's number_literal.cpp: decimal, `0x` hex, `0b` binary,
    // `0o` octal, decimal floats with optional `e` exponent, and hex
    // floats with the IEEE-754 `p` (binary) exponent.
    number_literal: $ => choice(
      /[0-9][0-9_]*/,
      /0x[0-9a-fA-F][0-9a-fA-F_]*/,
      /0b[01][01_]*/,
      /0o[0-7][0-7_]*/,
      /[0-9][0-9_]*\.[0-9_]+([eE][+-]?[0-9]+)?/,
      /[0-9][0-9_]*[eE][+-]?[0-9]+/,
      /0x[0-9a-fA-F][0-9a-fA-F_]*\.[0-9a-fA-F_]+([pP][+-]?[0-9]+)?/,
      /0x[0-9a-fA-F][0-9a-fA-F_]*[pP][+-]?[0-9]+/
    ),

    string_literal: $ => seq(
      '"',
      repeat(choice(
        $.escape_sequence,
        /[^"\\]+/
      )),
      '"'
    ),

    escape_sequence: $ => token.immediate(seq(
      '\\',
      choice(
        /[nrt\\0"]/,
        /x[0-9a-fA-F]{2}/,
        /u\{[0-9a-fA-F]+\}/
      )
    )),

    boolean_literal: $ => choice('true', 'false'),
  }
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)));
}
