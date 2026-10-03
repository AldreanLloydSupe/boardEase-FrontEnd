import { test } from "node:test";
import assert from "node:assert/strict";
import { managementUpdateNotice } from "../lib/management-update.ts";
test("announcements retain their title and link to the matching dashboard announcement", () => {
  const notice = managementUpdateNotice("abc", {
    kind: "announcement",
    title: "Water interruption",
    body: "Tomorrow at 10 AM",
    createdAt: "2026-10-03",
  });
  assert.equal(notice.type, "announcement");
  assert.equal(notice.title, "Water interruption");
  assert.equal(notice.body, "Tomorrow at 10 AM");
  assert.equal(notice.route, "/tenant/tenant-home?announcementId=message_abc");
  assert.equal(notice.local, true);
});
test("existing management messages remain messages and do not become public announcements", () => {
  const notice = managementUpdateNotice("old", {
    body: "Please contact management",
  });
  assert.equal(notice.type, "message");
  assert.equal(notice.title, "Message from management");
  assert.equal(notice.route, undefined);
});
