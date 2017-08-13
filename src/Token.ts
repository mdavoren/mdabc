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
    StyleSheetDirective,

    // File section tokens
    FileHeaderStart,
    FileHeaderEnd,
    TuneHeaderStart,
    TuneHeaderEnd,
    TuneBodyStart,
    TuneBodyEnd
};
export interface Token {
    type: TokenType;
    value: string|undefined;
    lineNumber: number;
    charNumber: number;
}
