; Keywords
[
  "fn"
  "tfn"
  "cfn"
  "const"
  "var"
  "if"
  "else"
  "while"
  "for"
  "in"
  "return"
  "break"
  "continue"
  "import"
  "extern"
  "export"
  "pub"
  "mut"
  "move"
  "match"
  "as"
  "struct"
  "enum"
  "union"
] @keyword

[
  "and"
  "or"
] @keyword.operator

; Types
(primitive_type) @type

; Boolean literals
(boolean_literal) @constant.builtin

; Function definitions
(function_declaration
  name: (identifier) @function)

; Function calls
(call_expression
  callee: (identifier) @function.call)

(call_expression
  callee: (member_expression
    member: (identifier) @function.call))

; Parameters
(parameter
  name: (identifier) @variable.parameter)

; Variables
(variable_declaration
  name: (identifier) @variable)

; Member access
(member_expression
  member: (identifier) @property)

; Import names
(import_declaration
  name: (identifier) @namespace)

; Operators
[
  "+"
  "-"
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "="
] @operator

; Punctuation
[
  "("
  ")"
  "{"
  "}"
  "["
  "]"
] @punctuation.bracket

[
  ","
  ";"
  ":"
  "."
] @punctuation.delimiter

; Literals
(number_literal) @number
(string_literal) @string
(escape_sequence) @string.escape

; Comments
(line_comment) @comment
