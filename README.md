# ape-eye

Firebase Cloud Function，接收目標網頁 URL，截圖後上傳至 Firebase Storage，回傳圖片連結。

## API

**Endpoint**
```
https://us-central1-smai-mxinfra-251128.cloudfunctions.net/screenshot
```

### GET（瀏覽器直接開圖）

在瀏覽器網址列貼上即可，截圖完成後直接顯示圖片：

```
https://us-central1-smai-mxinfra-251128.cloudfunctions.net/screenshot?url=https://example.com
```

回應：`302 redirect` → 圖片 URL

### POST（API 呼叫）

```bash
curl -X POST https://us-central1-smai-mxinfra-251128.cloudfunctions.net/screenshot \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

回應：

```json
{
  "success": true,
  "url": "https://storage.googleapis.com/..."
}
```

### 錯誤回應

| Status | 原因 |
|--------|------|
| 400 | URL 格式無效或未提供 |
| 422 | 截圖失敗（頁面無法載入等） |
| 500 | 上傳失敗或其他內部錯誤 |

```json
{ "success": false, "error": "錯誤訊息" }
```

## 開發

```bash
cd functions
npm install
npm test          # 執行所有測試
npm run build     # TypeScript 編譯
```

## 部署

```bash
firebase deploy --only functions
```
