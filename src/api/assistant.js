import { request, jsonBody } from './client'

const path = (workspaceId) => `assistant.php?workspace_id=${encodeURIComponent(workspaceId)}`
export const assistantApi = {
  history: (workspaceId) => request(path(workspaceId)),
  send: (workspaceId, message, requestId) => request(path(workspaceId), jsonBody('POST', { message, request_id: requestId })),
}
