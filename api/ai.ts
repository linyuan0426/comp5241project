import { handleAiRequest } from "../server/ai-handler.ts";

export default {
  fetch(request: Request) {
    return handleAiRequest(request);
  },
};
