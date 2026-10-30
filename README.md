# Mood to Art — Vercel 部署版

```
index.html      網站本身（畫筆引擎、一天一張、畫冊、經文、下載）
api/paint.js    伺服器函式：把心情句子交給 Claude，回傳作畫指令
package.json    讓 Vercel 以 ES module 執行 api/paint.js
```

## 部署步驟（GitHub + Vercel 網頁介面）

1. 到 https://platform.claude.com 申請 API key，並在 Billing / Limits 設定每月花費上限。
2. 在 GitHub 建一個新的 repository，把這個資料夾裡的檔案全部上傳。
3. 到 https://vercel.com 用 GitHub 登入 → Add New → Project → 選這個 repository。
4. Framework Preset 選「Other」，其他設定不用改。
5. 展開 Environment Variables，新增：
   - `ANTHROPIC_API_KEY` = 你的 API key
   - （選填）`CLAUDE_MODEL` = 想用的模型 ID，預設是 `claude-sonnet-5-5`
6. 按 Deploy，完成後會得到 `https://你的專案名.vercel.app`。

之後只要更新 GitHub 上的檔案，Vercel 會自動重新部署。

## 測試

- 打開網址，寫一句心情、按「Paint today’s feeling」。
- 一天只能畫一張。想自己再測一次，在網址後面加 `#reset` 打開，會清掉你今天的畫。
- 若出錯，到 Vercel 專案 → Logs 查看 `api/paint` 的錯誤訊息。
