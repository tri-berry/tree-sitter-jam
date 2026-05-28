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
  "match"
  "import"
  "extern"
  "export"
  "pub"
  "as"
  "struct"
  "union"
  "enum"
  "mut"
  "move"
] @keyword

; Logical operator keywords
[
  "and"
  "or"
] @keyword.operator

; Types
(primitive_type) @type
(named_type (identifier) @type)
(generic_type name: (identifier) @type)

; Pointer / slice / array type punctuation
(pointer_type
  qualifier: _ @keyword)

; Boolean and other constants
(boolean_literal) @constant.builtin

; Function definitions
(function_declaration
  name: (identifier) @function)

(method_declaration
  (function_declaration name: (identifier) @function.method))

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

; Field declarations and struct-literal fields
(field_declaration
  name: (identifier) @property)
(struct_literal_field
  name: (identifier) @property)

; Member access (read)
(member_expression
  member: (identifier) @property)

; Enum variants in patterns
(enum_variant_pattern
  enum: (identifier) @type
  variant: (identifier) @constructor)

; Imports
(import_declaration
  name: (identifier) @namespace)

; Operators
[
  "+"
  "-"
  "*"
  "%"
  "&"
  "|"
  "^"
  "~"
  "<<"
  ">>"
  "=="
  "!="
  "<"
  "<="
  ">"
  ">="
  "="
  "!"
  "..="
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

; Wildcard pattern
(wildcard_pattern) @character.special

; Variadic marker
(variadic_parameter) @punctuation.special

; Comments
(line_comment) @comment
