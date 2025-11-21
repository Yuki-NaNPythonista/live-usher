// Google Apps Script URL (デプロイ後に更新してください)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby7uk2GVRezyJ0ABxYrRpM-oTxWENgWEmObCjVDUpAf7LSSeqd2pbQjHtWkBLBD4m79/exec';

// DOM要素の取得
const inputScreen = document.getElementById('input-screen');
const successBothScreen = document.getElementById('success-both-screen');
const successEntranceOnlyScreen = document.getElementById('success-entrance-only-screen');
const errorScreen = document.getElementById('error-screen');
const loadingOverlay = document.getElementById('loading-overlay');
const campfireIdInput = document.getElementById('campfire-id');
const checkBtn = document.getElementById('check-btn');
const inputError = document.getElementById('input-error');
const userInfoBoth = document.getElementById('user-info-both');
const userInfoEntrance = document.getElementById('user-info-entrance');

// イベントリスナーの設定
document.addEventListener('DOMContentLoaded', () => {
  // ボタンクリックイベント
  checkBtn.addEventListener('click', handleCheckAccess);

  // Enterキー押下でも確認実行
  campfireIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleCheckAccess();
    }
  });

  // 入力時にエラーメッセージをクリア
  campfireIdInput.addEventListener('input', () => {
    clearError();
  });
});

/**
 * 入場権利確認処理
 */
async function handleCheckAccess() {
  const campfireId = campfireIdInput.value.trim();

  // 入力値検証
  const validation = validateInput(campfireId);
  if (!validation.valid) {
    showError(validation.message);
    return;
  }

  // ローディング表示
  showLoading();

  try {
    // API呼び出し
    const result = await checkAccess(campfireId);

    // ローディング非表示
    hideLoading();

    // 結果に応じて画面表示（3パターン）
    if (result.success && result.hasAccess) {
      // パターン判定
      if (result.pattern === 'both') {
        // パターン1: 入場権利=有、リハ見学権利=有
        showSuccessBothScreen(result.data);
      } else if (result.pattern === 'entrance_only') {
        // パターン2: 入場権利=有、リハ見学権利=無
        showSuccessEntranceOnlyScreen(result.data);
      } else {
        // デフォルト（念のため）
        showSuccessEntranceOnlyScreen(result.data);
      }
    } else if (result.success && !result.hasAccess) {
      // パターン3: 入場権利=無
      showErrorScreen();
    } else {
      // IDが見つからない場合
      showError(result.message || '該当するIDが見つかりません');
    }
  } catch (error) {
    hideLoading();
    showError('システムエラーが発生しました。しばらくしてから再度お試しください。');
    console.error('Error:', error);
  }
}

/**
 * 入力値検証
 */
function validateInput(campfireId) {
  // 空文字チェック
  if (!campfireId) {
    return { valid: false, message: 'IDを入力してください' };
  }

  // 文字数チェック (3文字以上50文字以下)
  if (campfireId.length < 3) {
    return { valid: false, message: 'IDは3文字以上で入力してください' };
  }

  if (campfireId.length > 50) {
    return { valid: false, message: 'IDは50文字以内で入力してください' };
  }

  return { valid: true };
}

/**
 * API呼び出し - 入場権利確認 (GET版)
 */
async function checkAccess(campfireId) {
  // SCRIPT_URLが設定されていない場合
  if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
    console.error('Error: SCRIPT_URLが設定されていません');
    throw new Error('Google Apps Script URLが設定されていません');
  }

  console.log('=== API呼び出し開始 (GET) ===');
  console.log('URL:', SCRIPT_URL);
  console.log('CAMPFIRE ID:', campfireId);

  try {
    // GETリクエストなので、URLにパラメータを追加
    const url = `${SCRIPT_URL}?campfireId=${encodeURIComponent(campfireId)}`;
    console.log('Request URL:', url);

    const response = await fetch(url, {
      method: 'GET',
    });

    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      console.error('HTTP Error:', response.status, response.statusText);
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    console.log('Content-Type:', contentType);

    const responseText = await response.text();
    console.log('Response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed data:', data);
    } catch (parseError) {
      console.error('JSON Parse Error:', parseError);
      console.error('Response was:', responseText);
      throw new Error('レスポンスの解析に失敗しました');
    }

    return data;
  } catch (error) {
    console.error('=== API Error ===');
    console.error('Error type:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

/**
 * 入場OK + リハ見学OK画面を表示（パターン1）
 */
function showSuccessBothScreen(data) {
  // 入力画面を非表示
  inputScreen.style.display = 'none';

  // ユーザー情報を表示
  if (data && (data.name || data.returnItem)) {
    let infoHTML = '';
    if (data.name) {
      infoHTML += `<p><strong>お名前:</strong> ${escapeHtml(data.name)}</p>`;
    }
    if (data.returnItem) {
      infoHTML += `<p><strong>リターン:</strong> ${escapeHtml(data.returnItem)}</p>`;
    }
    infoHTML += `<p><strong>リハ見学:</strong> 可能</p>`;
    userInfoBoth.innerHTML = infoHTML;
  } else {
    userInfoBoth.style.display = 'none';
  }

  // 両方OK画面を表示
  successBothScreen.style.display = 'block';
}

/**
 * 入場OK + リハ見学NG画面を表示（パターン2）
 */
function showSuccessEntranceOnlyScreen(data) {
  // 入力画面を非表示
  inputScreen.style.display = 'none';

  // ユーザー情報を表示
  if (data && (data.name || data.returnItem)) {
    let infoHTML = '';
    if (data.name) {
      infoHTML += `<p><strong>お名前:</strong> ${escapeHtml(data.name)}</p>`;
    }
    if (data.returnItem) {
      infoHTML += `<p><strong>リターン:</strong> ${escapeHtml(data.returnItem)}</p>`;
    }
    userInfoEntrance.innerHTML = infoHTML;
  } else {
    userInfoEntrance.style.display = 'none';
  }

  // 入場のみOK画面を表示
  successEntranceOnlyScreen.style.display = 'block';
}

/**
 * 入場NG画面を表示
 */
function showErrorScreen() {
  // 入力画面を非表示
  inputScreen.style.display = 'none';

  // エラー画面を表示
  errorScreen.style.display = 'block';
}

/**
 * エラーメッセージを表示
 */
function showError(message) {
  inputError.textContent = message;
  campfireIdInput.classList.add('error');
}

/**
 * エラーメッセージをクリア
 */
function clearError() {
  inputError.textContent = '';
  campfireIdInput.classList.remove('error');
}

/**
 * ローディングを表示
 */
function showLoading() {
  loadingOverlay.style.display = 'flex';
  checkBtn.disabled = true;
}

/**
 * ローディングを非表示
 */
function hideLoading() {
  loadingOverlay.style.display = 'none';
  checkBtn.disabled = false;
}

/**
 * HTMLエスケープ (XSS対策)
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
