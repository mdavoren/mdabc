export enum TokenType {
    // System
    Error,
    EOF,

    // Line tokens
    AbcDeclaration,
    LineComment,
    BlankLine,
    InformationField,
    Directive,
    Text,

    // File section tokens
    FileHeaderStart,
    FileHeaderEnd,
    TuneHeaderStart,
    TuneHeaderEnd,
    TuneBodyStart,
    TuneBodyEnd
}
export enum TokenSubType {
    Falsey,  // So TokenSubType.Text is not considered false-y
    // TextDirective
    Text,
    Center,
    BeginText,
    EndText
}
export interface Token {
    type: TokenType;
    subType: TokenSubType|undefined;
    originalLine: string,
    value: string|undefined;
    lineNumber: number;
}
