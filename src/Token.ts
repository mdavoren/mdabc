export enum TokenType {
    // System
    Error,
    EOF,

    // Line tokens
    AbcDeclaration,
    BlankLine,
    Comment,
    FreeText,
    InformationField,
    MusicCode,
    StyleSheet,
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
    value: string|undefined;
    lineNumber: number;
    charNumber: number;
}
