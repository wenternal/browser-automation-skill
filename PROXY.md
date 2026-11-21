# CDP Proxy Compatibility / CDP Proxy 兼容性

The CLI expects an already-running HTTP Proxy that exposes the endpoints below. This repository does not include the Proxy implementation, start Chrome, or configure remote debugging.

命令行工具要求已有一个运行中的 HTTP Proxy，并提供下列端点。本仓库不包含 Proxy 实现，不负责启动 Chrome 或配置远程调试。

Base URL defaults to `http://127.0.0.1:3456`; configure another origin with `CDP_PROXY_URL`.

默认基础地址为 `http://127.0.0.1:3456`；可通过 `CDP_PROXY_URL` 配置其他地址。

| Endpoint | Method | CLI use | Expected behavior |
|---|---|---|---|
| `/health` | GET | `health` | Proxy / browser connection status |
| `/targets` | GET | `targets` | List open page targets |
| `/new?url=...` | GET | `open` | Create isolated tab and return `targetId` |
| `/info?target=ID` | GET | `info` | Return title, URL and ready state |
| `/close?target=ID` | GET | `close` | Close the specified target |
| `/navigate?target=ID&url=...` | GET | `navigate` | Navigate target |
| `/back?target=ID` | GET | `back` | Navigate back |
| `/eval?target=ID` | POST text/plain | `title`, `dom`, `eval`, `instrument`, `errors`, `network`, form commands | Evaluate JavaScript in page context and return a JSON-serializable value |
| `/click?target=ID` | POST text/plain | `click` | Click CSS selector (typically DOM-level click) |
| `/scroll?target=ID&direction=...` | GET | `scroll` | Scroll to top/bottom or by direction; `y=PIXELS` is also supported |
| `/screenshot?target=ID&file=...` | GET | `screenshot` | Save a page screenshot to the given file path |

## Optional Proxy endpoints / 可选 Proxy 端点

The underlying Proxy may offer these additional endpoints, though this CLI currently does not wrap them:

底层 Proxy 还可能提供以下额外端点，但当前 CLI 没有封装：

- `POST /clickAt?target=ID`, body is a CSS selector: send a real pointer gesture.
- `POST /setFiles?target=ID`, JSON body such as `{"selector":"input[type=file]","files":["/path/to/file"]}`: set files on a file input.

## Notes / 注意事项

- Encode query parameter values (the CLI does this automatically).
- `/eval` results must be serializable; return attributes, text, geometry or structured data, not DOM objects.
- Proxy implementations differ. Confirm compatibility and use its own safety and authorization requirements.
- Never assume `/eval` behavior or network visibility beyond what the Proxy provides.

- Query 参数需要 URL 编码（CLI 会自动处理）。
- `/eval` 返回值必须可序列化；返回属性、文字、坐标或结构化数据，不要直接返回 DOM 对象。
- 不同 Proxy 实现可能有差异，应核对兼容性并遵循其安全和授权要求。
- 不应假定 `/eval` 的行为或网络可见性超出 Proxy 实际能力。
