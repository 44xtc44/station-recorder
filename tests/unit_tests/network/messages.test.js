import { msgStyle, htmlFormat , sanitizeHTML} from "../../../static/js/network/messages";

describe("Log messages to UI and log archive.", () => {
  test("HTML styles for different log levels.", async () => {
    expect(await msgStyle("success")).toBe("logSuccess");
    expect(await msgStyle("warning")).toBe("logWarning");
    expect(await msgStyle("error")).toBe("logError");
    expect(await msgStyle()).toBe("logSuccess");
  });

  test("HTML string dict for UI (line cut) and log archive", async () => {
    expect(await htmlFormat("jest test", "logSuccess")).toStrictEqual({
      logLine: "<div><span class=logSuccess>&nbspjest test</span></div>",
      uiMonitorLine:
        "<div class=msgContainer><span class=logSuccess>&nbspjest test</span></div>",
    });
  });
});

describe("HTML Parser, sanitizer.", () => {
  test("Pass all string item through.", async () => {
    expect(
      await sanitizeHTML(
        "<div><span class=logSuccess> jest test</span></div>"
      )
    ).toBe("<div><span class=\"logSuccess\"> jest test</span></div>");
  });
});
