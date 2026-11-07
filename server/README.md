# 衣物识别服务

批量导入页用它识别照片。密钥只放在这里，不能放进小程序。

    cp server/.env.example server/.env   # 填写密钥和模型
    node --env-file=server/.env server/recognize-server.mjs

部署后：

1. 把 `utils/config.js` 的 `RECOGNIZE_URL` 改成 `https://你的域名/recognize`。
2. 在微信公众平台把该域名加入 request 合法域名（需要 HTTPS）。
3. 根据预算调整 `DAILY_LIMIT`。

接口：`POST /recognize`，请求体 `{ "image": "<base64>", "mimeType": "image/jpeg" }`，
成功返回 `{ "result": { name, category, accessoryType, color, seasons, styles, thickness } }`，
失败返回 `{ "error": "可展示的提示" }`。

限流计数保存在内存里，重启清零。这个接口没有用户登录，
上线后要留意调用量；条件允许时优先部署到微信云托管，用平台身份区分用户。
