import { expect } from 'chai';
let fs = require("fs")
let os = require('os')

import {LineTokenizer} from '../src/LineTokenizer';
import {TokenType, Token} from '../src/Token';

function test(inputFile: string, expectedFile: string, inTune: boolean) : void {
    let inputData: string = fs.readFileSync("./test/data/line/" + inputFile, "utf8");
    let expectedResult: string = fs.readFileSync("./test/data/line/" + expectedFile, "utf8");
    let tokenizer = new LineTokenizer(inputData);
    let token: Token;
    let actualResult: string = "";
    let first: boolean = true;
    while (token = tokenizer.getToken(inTune), token.type !== TokenType.EOF) {
        if (first) {
            first = false;
        } else {
            actualResult += os.EOL;           
        }
        actualResult += TokenType[token.type] + ":";
        actualResult += token.value ? " " + token.value : ""
    }
    expect(actualResult).to.equal(expectedResult);
}

describe('LineTokenizer', function() {
    it('should detect the abc declaration', function() {
        test("abcDeclaration.abc", "abcDeclaration.exp", false);
    })
    it('should detect a blank line', function() {
        test("blankLine.abc", "blankLine.exp", false);
    })
    it('should detect a comment line', function() {
        test("comment.abc", "comment.exp", false)
    })
    it('should detect a free text line', function() {
        test("freeText.abc", "freeText.exp", false)
    })
    it('should detect an information field line', function() {
        test("informationField.abc", "informationField.exp", false)
    })
    it('should detect an information field line with a comment', function() {
        test("informationFieldWithComment.abc", "informationFieldWithComment.exp", false)
    })
    it('should detect a music code line', function() {
        test("musicCode.abc", "musicCode.exp", true)
    })
    it('should detect a music code line with a comment', function() {
        test("musicCodeWithComment.abc", "musicCodeWithComment.exp", true)
    })
    it('should detect a stylesheet line', function() {
        test("stylesheet.abc", "stylesheet.exp", false)
    })

})