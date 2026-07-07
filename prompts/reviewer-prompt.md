# Reviewer Prompt

請只做 review，不要改檔。

檢查目前 diff：

1. manifest 是否新增禁止權限。
2. token 是否可能出現在 console、error、diagnostics、test snapshots。
3. page text / selected text / full tab URL 是否可能進 diagnostics。
4. restricted pages 是否完整阻擋。
5. redaction 是否有 tests。
6. browser context 是否包成 untrusted。
7. UI 是否清楚顯示 Chat only / Follow active tab / blocked。
8. tests 是否涵蓋安全行為。

請用表格輸出：Severity、File、Finding、Why it matters、Suggested fix、Test needed。
