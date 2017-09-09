import { expect } from "chai";
import fs = require("fs");
import os = require("os");
import assert = require("assert");

import {LineTokenizer} from "../src/LineTokenizer";

class CleanerTests extends LineTokenizer {
    constructor() {
        super("");
    }
    public test(fileName: string): void {
        const dataDir: string = "./test/data/character/";
        const inputData: string = fs.readFileSync(dataDir + fileName + ".abc", "utf8");
        const expectedData: string = fs.readFileSync(dataDir + fileName + ".exp", "utf8");

        const inLines: string[] = inputData.split(os.EOL);
        const exLines: string[] = expectedData.split(os.EOL);
        assert(inLines.length === exLines.length, "Input and expected file must have same number of lines");

        for (let ii = 0; ii < inLines.length; ii++) {
            const actualResult = this.clean(inLines[ii]);
            const expectedResult = exLines[ii];
            it("should clean character sequence '" + inLines[ii] + "'", (): void => {
                expect(actualResult).to.equal(expectedResult);
            });
        }
    }
}

describe("CleanerTests", (): void => {
    const tester: CleanerTests = new CleanerTests();

    tester.test("characters");
});
