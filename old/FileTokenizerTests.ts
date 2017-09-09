import {Token, TokenType, TokenSubType} from "../src/Token";
import {FileTokenizer} from "../src/FileTokenizer";

import { expect } from "chai";
import fs = require("fs");
import os = require("os");

function test(fileName: string): void {
    const dataDir: string = "./test/data/file/";
    const inputData: string = fs.readFileSync(dataDir + fileName + ".abc", "utf8");
    const expectedResult: string = fs.readFileSync(dataDir + fileName + ".exp", "utf8");
    const tokenizer = new FileTokenizer(inputData);
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

    while (token = tokenizer.getToken(), token.type !== TokenType.EOF) {
        processToken(token);
    }

    expect(actualResult).to.equal(expectedResult);
}

describe("FileTokenizer", (): void => {
    it("should be happy", (): void => {
        test("happy");
    });

    it("should handle an ABC declaration", (): void => {
        test("A");
    });

    it("should handle an ABC declaration, file header", (): void => {
        test("AH");
    });

    it("should handle an ABC declaration, free text", (): void => {
        test("AF");
    });

    it("should handle an ABC declaration, blank line", (): void => {
        test("AB");
    });

    it("should handle an ABC declaration, blank line, free text", (): void => {
        test("ABF");
    });

    it("should handle an ABC declaration, file header, free text", (): void => {
        test("AHF");
    });

    it("should handle an ABC declaration, file header, blank line, free text", (): void => {
        test("AHBF");
    });

    it("should handle a blank line, free text", (): void => {
        test("BF");
    });

    it("should handle free text", (): void => {
        test("F");
    });

    it("should handle file header", (): void => {
        test("H");
    });
});
