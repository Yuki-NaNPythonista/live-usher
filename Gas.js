/**
 * Google Apps Script - ライブ入場権利確認システム
 *
 * このスクリプトをGoogleスプレッドシートに関連付けて、Webアプリとしてデプロイしてください。
 *
 * デプロイ手順:
 * 1. Googleスプレッドシートを開く
 * 2. 「拡張機能」→「Apps Script」をクリック
 * 3. このコードを貼り付け
 * 4. 「デプロイ」→「新しいデプロイ」をクリック
 * 5. 種類: ウェブアプリ
 * 6. 実行ユーザー: 自分
 * 7. アクセスできるユーザー: 全員
 * 8. デプロイURLをコピーして、script.jsのSCRIPT_URLに設定
 */

// シート名の定数
const SHEET_NAME = '入場者リスト';

/**
 * POSTリクエストを処理
 */
function doPost(e) {
  try {
    // CORS対応のヘッダー設定
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };

    // リクエストボディのパース
    let params;
    try {
      params = JSON.parse(e.postData.contents);
    } catch (parseError) {
      Logger.log('JSON Parse Error: ' + parseError.message);
      return createJsonResponse(
        false,
        false,
        'リクエスト形式が正しくありません'
      );
    }

    const campfireId = params.campfireId;

    // 入力検証
    if (!campfireId || typeof campfireId !== 'string' || campfireId.trim() === '') {
      return createJsonResponse(false, false, 'IDが指定されていません');
    }

    // スプレッドシート検索
    const result = searchUser(campfireId.trim());

    if (result.found) {
      if (result.hasAccess) {
        return createJsonResponse(
          true,
          true,
          '入場権利があります',
          result.data
        );
      } else {
        return createJsonResponse(true, false, '入場権利がありません');
      }
    } else {
      return createJsonResponse(false, false, '該当するIDが見つかりません');
    }

  } catch (error) {
    Logger.log('Error in doPost: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    return createJsonResponse(false, false, 'システムエラーが発生しました');
  }
}

/**
 * OPTIONSリクエストを処理 (CORS preflight)
 */
function doOptions(e) {
  return ContentService
    .createTextOutput('')
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * スプレッドシートからユーザーを検索
 */
function searchUser(campfireId) {
  try {
    // アクティブなスプレッドシートを取得
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

    // シートを取得
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      Logger.log('Sheet not found: ' + SHEET_NAME);
      throw new Error('指定されたシートが見つかりません');
    }

    // データ範囲を取得
    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    // データが存在しない場合
    if (values.length <= 1) {
      Logger.log('No data found in sheet');
      return { found: false };
    }

    // ヘッダー行をスキップして検索 (i=1から開始)
    for (let i = 1; i < values.length; i++) {
      const row = values[i];

      // A列: CAMPFIRE_ID
      const id = row[0] ? String(row[0]).trim() : '';

      // IDが一致した場合
      if (id === campfireId) {
        const name = row[1] ? String(row[1]) : '';          // B列: 氏名
        const returnItem = row[2] ? String(row[2]) : '';    // C列: リターン内容
        const access = row[3] ? String(row[3]).trim() : ''; // D列: 入場権利

        Logger.log('User found - ID: ' + id + ', Access: ' + access);

        return {
          found: true,
          hasAccess: access === '有',
          data: {
            name: name || null,
            returnItem: returnItem || null
          }
        };
      }
    }

    // 見つからない場合
    Logger.log('User not found - ID: ' + campfireId);
    return { found: false };

  } catch (error) {
    Logger.log('Error in searchUser: ' + error.message);
    throw error;
  }
}

/**
 * JSONレスポンスを生成
 */
function createJsonResponse(success, hasAccess, message, data = null) {
  const response = {
    success: success,
    hasAccess: hasAccess,
    message: message
  };

  // データがある場合は追加
  if (data) {
    response.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeaders({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
}

/**
 * テスト用関数 (Apps Scriptエディタから実行可能)
 */
function testSearchUser() {
  // テスト用のCAMPFIRE IDを指定
  const testId = 'user12345';

  Logger.log('Testing with ID: ' + testId);
  const result = searchUser(testId);
  Logger.log('Result: ' + JSON.stringify(result));
}

/**
 * スプレッドシートの構造確認用関数 (デバッグ用)
 */
function checkSheetStructure() {
  try {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);

    if (!sheet) {
      Logger.log('Sheet "' + SHEET_NAME + '" not found');
      Logger.log('Available sheets: ' + spreadsheet.getSheets().map(s => s.getName()).join(', '));
      return;
    }

    const dataRange = sheet.getDataRange();
    const values = dataRange.getValues();

    Logger.log('Sheet found: ' + SHEET_NAME);
    Logger.log('Number of rows: ' + values.length);
    Logger.log('Number of columns: ' + (values.length > 0 ? values[0].length : 0));

    if (values.length > 0) {
      Logger.log('Header row: ' + JSON.stringify(values[0]));
    }

    if (values.length > 1) {
      Logger.log('First data row: ' + JSON.stringify(values[1]));
    }

  } catch (error) {
    Logger.log('Error: ' + error.message);
  }
}
