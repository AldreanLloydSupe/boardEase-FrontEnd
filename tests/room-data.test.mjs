import assert from "node:assert/strict";
import { test } from "node:test";
import { isRoomBrowserVisible, roomStatusLabel } from "../lib/room-data.ts";

test("tenant room browser keeps occupied rooms visible and labels them as occupied", () => {
  assert.equal(isRoomBrowserVisible("occupied"), true);
  assert.equal(isRoomBrowserVisible("available"), true);
  assert.equal(roomStatusLabel("occupied"), "Occupied");
  assert.equal(roomStatusLabel("available"), "Available");
});
