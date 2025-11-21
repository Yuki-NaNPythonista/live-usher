/**
 * Google Apps Script - ライブ入場権利確認システム (GET版)
 *
 * CORS問題を回避するため、GETリクエストに対応したバージョンです。
 * POSTでうまくいかない場合は、こちらを使用してください。
 */

// シート名の定数
const SHEET_NAME = '入場者リスト';

/**
 * GETリクエストを処理
 */
function doGet(e) {
  try {
    // クエリパラメータから CAMPFIRE ID を取得
    const campfireId = e.parameter.campfireId;

    // 入力検証
    if (!campfireId || typeof campfireId !== 'string' || campfireId.trim() === '') {
      return createJsonResponse(false, false, 'IDが指定されていません');
    }

    // スプレッドシート検索
    const result = searchUser(campfireId.trim());

    if (result.found) {
      // 入場権利とリハ見学権利の組み合わせで判定
      if (result.hasAccess && result.hasRehearsalAccess) {
        // パターン1: 入場権利=有、リハ見学権利=有
        return createJsonResponse(
          true,
          true,
          '入場権利とリハ見学権利があります',
          result.data,
          'both'
        );
      } else if (result.hasAccess && !result.hasRehearsalAccess) {
        // パターン2: 入場権利=有、リハ見学権利=無
        return createJsonResponse(
          true,
          true,
          '入場権利があります',
          result.data,
          'entrance_only'
        );
      } else {
        // パターン3: 入場権利=無
        return createJsonResponse(
          true,
          false,
          '入場権利がありません',
          null,
          'none'
        );
      }
    } else {
      return createJsonResponse(false, false, '該当するIDが見つかりません', null, 'not_found');
    }

  } catch (error) {
    Logger.log('Error in doGet: ' + error.message);
    Logger.log('Stack trace: ' + error.stack);
    return createJsonResponse(false, false, 'システムエラーが発生しました');
  }
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
        const name = row[1] ? String(row[1]) : '';                   // B列: 氏名
        const returnItem = row[2] ? String(row[2]) : '';             // C列: リターン内容
        const access = row[3] ? String(row[3]).trim() : '';          // D列: 入場権利
        const rehearsalAccess = row[4] ? String(row[4]).trim() : ''; // E列: リハ見学権利
        const note = row[5] ? String(row[5]) : '';                   // F列: 備考

        Logger.log('User found - ID: ' + id + ', Access: ' + access + ', RehearsalAccess: ' + rehearsalAccess);

        return {
          found: true,
          hasAccess: access === '有',
          hasRehearsalAccess: rehearsalAccess === '有',
          data: {
            name: name || null,
            returnItem: returnItem || null,
            rehearsalAccess: rehearsalAccess || null,
            note: note || null
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
function createJsonResponse(success, hasAccess, message, data = null, pattern = null) {
  const response = {
    success: success,
    hasAccess: hasAccess,
    message: message
  };

  // パターン情報を追加
  if (pattern) {
    response.pattern = pattern;
  }

  // データがある場合は追加
  if (data) {
    response.data = data;
  }

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
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
