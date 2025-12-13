---
trigger: always_on
---

テストを実行するときはdocker container上で実行してください。基本コマンドは `docker compose run --rm app npm test` です。
ほかで立ち上げているコンテナを終了させたりせずに、テスト実行専用の一時的なコンテナを起動してテストを実行するようにしてください。