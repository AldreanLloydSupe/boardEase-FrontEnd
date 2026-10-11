export function managementUpdateNotice(
  id: string,
  data: Record<string, unknown>,
) {
  const announcement = data.kind === "announcement";
  const noticeId = "message_" + id;
  return {
    id: noticeId,
    title: announcement
      ? String(data.title || "BoardEase announcement")
      : "Message from management",
    body: String(data.body || ""),
    createdAt: data.createdAt,
    postToBulletin: data.postToBulletin === true,
    type: announcement ? "announcement" : "message",
    route: announcement
      ? "/tenant/tenant-home?announcementId=" + encodeURIComponent(noticeId)
      : undefined,
    local: true,
  };
}
