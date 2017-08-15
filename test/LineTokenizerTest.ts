import { expect } from "chai";
import fs = require("fs");
import os = require("os");

import {LineTokenizer} from "../src/LineTokenizer";
import {TokenType, TokenSubType, Token} from "../src/Token";

function test(fileName: string, inTune: boolean): void {
    const dataDir: string = "./test/data/line/";
    const inputData: string = fs.readFileSync(dataDir + fileName + ".abc", "utf8");
    const expectedResult: string = fs.readFileSync(dataDir + fileName + ".exp", "utf8");
    const tokenizer = new LineTokenizer(inputData);
    let token: Token;
    let actualResult: string = "";
    let first: boolean = true;

    function processToken(tok: Token): void {
        if (first) {
            first = false;
        } else {
            actualResult += os.EOL;
        }
        actualResult += TokenType[tok.type];
        actualResult += tok.subType ? "(" + TokenSubType[tok.subType] + ")" : "";
        actualResult += ":";
        actualResult += tok.value ? " " + tok.value : "";
    }

    tokenizer.setErrorCB(processToken);

    while (token = tokenizer.getToken(inTune), token.type !== TokenType.EOF) {
        processToken(token);
    }

    expect(actualResult).to.equal(expectedResult);
}

describe("LineTokenizer", (): void => {
    it("should detect the abc declaration", (): void => {
        test("abcDeclaration", false);
    });
    it("should detect a blank line", (): void => {
        test("blankLine", false);
    });
    it("should detect a comment line", (): void => {
        test("comment", false);
    });
    it("should detect a free text line", (): void => {
        test("freeText", false);
    });
    it("should detect an information field line", (): void => {
        test("informationField", false);
    });
    it("should detect an information field line with a comment", (): void => {
        test("informationFieldWithComment", false);
    });
    it("should detect a music code line", (): void => {
        test("musicCode", true);
    });
    it("should detect a music code line with a comment", (): void => {
        test("musicCodeWithComment", true);
    });
    it("should detect a stylesheet line", (): void => {
        test("stylesheet", false);
    });
    it("should detect a %%text directive", (): void => {
        test("text", false);
    });
    it("should detect a %%center directive", (): void => {
        test("center", false);
    });
    it("should detect a %%begintext/%%endtext block", (): void => {
        test("beginEnd", false);
    });
});
