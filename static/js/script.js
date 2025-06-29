/**
 * HTML要素の取得
 */
const startButton = document.getElementById('start-button');
const submitButton = document.getElementById('submit-button');
const quizArea = document.getElementById('quiz-area');
const quizImage = document.getElementById('quiz-image');
const labels = [
    document.getElementById('label1'), document.getElementById('label2'),
    document.getElementById('label3'), document.getElementById('label4')
];
const radioButtons = [
    document.getElementById('select1'), document.getElementById('select2'),
    document.getElementById('select3'), document.getElementById('select4')
];
const customAlert = document.getElementById('custom-alert-overlay');
const alertTitle = document.getElementById('custom-alert-title');
const alertText = document.getElementById('custom-alert-text');
const alertConfirmBtn = document.getElementById('alert-confirm-btn');
const alertCancelBtn = document.getElementById('alert-cancel-btn');
const logButton = document.getElementById('log-button');
const logOptionButton = document.getElementById('log-option-button');
const logArea = document.getElementById('log-area');


/**
 * グローバル変数
 */
let gameState = 'start'; // アプリの状態を管理する変数
let currentCorrectAnswer = '';
let timerId;
let timeLeft = 10;
let quizHistory = []; // 解答履歴を保存する配列を追加
let isFilterIncorrectOnly = false; // 不正解フィルタの状態を管理する変数


/** 
 * イベントリスナー
 */
// スタートボタン
startButton.addEventListener('click', () => {
    startQuiz();
});
// 決定ボタン
submitButton.addEventListener('click', () => {
    checkAnswer();
});
// ログ表示ボタン
logButton.addEventListener('click', () => {
    toggleLogArea();
});
logOptionButton.addEventListener('click', () => {
    isFilterIncorrectOnly = !isFilterIncorrectOnly; // フィルタの状態を反転させる
    logOptionButton.classList.toggle('active', isFilterIncorrectOnly); // ボタンに 'active' クラスを付けたり外したりして色を変える

    if (logArea.style.display === 'block') { // もし履歴エリアが表示中なら、フィルタを適用して再描画する
        renderHistory();
    }
});

// ★★★ キーボード操作の総合受付（マネージャー） ★★★
document.addEventListener('keydown', (event) => {
    // 現在の状態で処理を振り分ける
    switch (gameState) {
        case 'quiz':
            handleQuizKeyDown(event);
            break;
        case 'dialog':
            handleDialogKeyDown(event);
            break;
    }
});


/**
 * ゲームの主要な関数
 */
// クイズを開始する
function startQuiz() {
    gameState = 'quiz'; // 状態を「クイズ中」に設定
    clearInterval(timerId);
    timeLeft = 15;
    document.getElementById('time-left').textContent = timeLeft;

    startButton.style.display = 'none';
    quizArea.style.display = 'block';

    timerId = setInterval(() => {
        timeLeft -= 0.1;
        document.getElementById('time-left').textContent = parseFloat(timeLeft.toFixed(1));

        if (timeLeft <= 0) {
            clearInterval(timerId);
            // 将来的にここもカスタムアラートにすると良いですね
            alert('時間切れ！ 正解は「' + currentCorrectAnswer + '」でした！！');
            startQuiz();
        }
    }, 100);

    fetch('/api/quiz')
        .then(response => response.json())
        .then(quizData => {
            displayQuiz(quizData);
            currentCorrectAnswer = quizData.correctAnswer;
        })
        .catch(error => {
            console.error('クイズの取得に失敗しました:', error);
            alert('クイズの読み込みに失敗しました。');
        });
}

// クイズ画面を更新する
function displayQuiz(data) {
    quizImage.src = data.image_path;
    for (let i = 0; i < 4; i++) {
        labels[i].textContent = data.choices[i];
        radioButtons[i].value = data.choices[i];
    }
    // 最初の選択肢をデフォルトでチェック状態にしておく
    if(radioButtons.length > 0) {
        radioButtons[0].checked = true;
    }
}

// 答えをチェックする
function checkAnswer() {
    clearInterval(timerId);
    const selectedAnswer = document.querySelector('input[name="select"]:checked');

    if (!selectedAnswer) {
        alert('答えを選択してください！');
        startQuiz(); // タイマーだけ再開しても良いかもしれません
        return;
    }

    gameState = 'dialog'; // 状態を「ダイアログ表示中」に設定
    const isCorrect = selectedAnswer.value === currentCorrectAnswer;
    const title = isCorrect ? '正解！' : '不正解...';
    const text = isCorrect ? 'やるね！' : `正解は「${currentCorrectAnswer}」でした！`;

    const historyEntry = { // 解答履歴オブジェクトを作成・保存
        isCorrect: isCorrect,
        imagePath: quizImage.src, // 現在表示されている画像のパス
        choices: labels.map(label => label.textContent), // 現在の選択肢
        userAnswer: selectedAnswer.value,
        correctAnswer: currentCorrectAnswer
    };
    // 配列の先頭に追加し、100件を超えたら古いものを削除
    quizHistory.unshift(historyEntry);
    if (quizHistory.length > 100) {
        quizHistory.pop();
    }
    if (logArea.style.display === 'block') { // もし履歴エリアが表示中なら、表示をリアルタイムで更新する
        renderHistory();
    }

    originalAlert(title, text, '続ける', '休む')
        .then(userChoice => {
            if (userChoice) {
                startQuiz();
            } else {
                endQuiz();
            }
        });
}

// クイズを終了する
function endQuiz() {
    gameState = 'start'; // 状態を「スタート画面」に設定
    startButton.style.display = 'block';
    quizArea.style.display = 'none';
}

function toggleLogArea() { // 履歴エリアの表示/非表示を切り替える関数
    const isHidden = logArea.style.display === 'none' || logArea.style.display === '';

    if (isHidden) {
        renderHistory(); // 表示する前に中身を作成
        logArea.style.display = 'block';
        logButton.textContent = 'これまでの回答を閉じる△';
    } else {
        logArea.style.display = 'none';
        logButton.textContent = 'これまでの回答を表示▽';
    }
}


function renderHistory() { // 履歴をHTMLとして描画する関数
    // 既存の内容をクリア
    logArea.innerHTML = '';

    // フィルタリング処理
    let historyToRender;
    if (isFilterIncorrectOnly) {
        // isCorrectがfalseのものだけを抽出した新しい配列を作る
        historyToRender = quizHistory.filter(entry => !entry.isCorrect);
    } else {
        // フィルタがオフの場合は、全ての履歴を使う
        historyToRender = quizHistory;
    }

    if (historyToRender.length === 0) {
        if (isFilterIncorrectOnly) {
            logArea.innerHTML = '<p>不正解の履歴はありません。</p>';
        } else {
            logArea.innerHTML = '<p>まだ解答履歴がありません。</p>';
        }
        return;
    }

    // 履歴データ一件ごとにHTML要素を作成
    historyToRender.forEach(entry => {
        // 全体を囲むdiv
        const logEntryDiv = document.createElement('div');
        logEntryDiv.className = 'log-entry';
        if (entry.isCorrect) {
            logEntryDiv.classList.add('correct');
        } else {
            logEntryDiv.classList.add('incorrect');
        }

        // 「正解/不正解」のタイトル
        const resultTitle = document.createElement('h3');
        resultTitle.textContent = entry.isCorrect ? '正解' : '不正解';
        logEntryDiv.appendChild(resultTitle);

        // 画像と選択肢を囲むdiv
        const contentDiv = document.createElement('div');
        contentDiv.className = 'log-content';

        // 画像
        const img = document.createElement('img');
        img.src = entry.imagePath;
        contentDiv.appendChild(img);

        // 選択肢リスト
        const choicesList = document.createElement('ul');
        entry.choices.forEach(choice => {
            const listItem = document.createElement('li');
            let choiceText = choice;

            // 正解の印
            if (choice === entry.correctAnswer) {
                listItem.innerHTML = `<strong>${choiceText}</strong> ⚪︎ 正解`;
            }
            // 不正解で、かつユーザーの回答だった場合
            else if (!entry.isCorrect && choice === entry.userAnswer) {
                listItem.innerHTML = `${choiceText} × あなたの回答`;
            }
            else {
                listItem.textContent = choiceText;
            }
            choicesList.appendChild(listItem);
        });
        contentDiv.appendChild(choicesList);
        
        logEntryDiv.appendChild(contentDiv);
        logArea.appendChild(logEntryDiv);
    });
}

/**
 * キーボード処理
 */ 
// クイズ中のキー操作を処理する関数
function handleQuizKeyDown(event) {
    let currentIndex = radioButtons.findIndex(rb => rb.checked);
    if (currentIndex === -1) currentIndex = 0; // 何も選択されていなければ0番目から

    switch (event.key) {
        case 'ArrowDown':
        case 'ArrowRight':
            event.preventDefault();
            const nextIndex = (currentIndex + 1) % radioButtons.length;
            radioButtons[nextIndex].checked = true;
            break;
        case 'ArrowUp':
        case 'ArrowLeft':
            event.preventDefault();
            const prevIndex = (currentIndex - 1 + radioButtons.length) % radioButtons.length;
            radioButtons[prevIndex].checked = true;
            break;
        case 'Enter':
            event.preventDefault();
            submitButton.click();
            break;
    }
}

// ダイアログ表示中のキー操作を処理する関数
function handleDialogKeyDown(event) {
    // この関数はoriginalAlertから呼び出されるのではなく、
    // 総合受付のkeydownリスナーから直接呼び出される
    switch (event.key) {
        case 'Enter':
            event.preventDefault();
            alertConfirmBtn.click();
            break;
        case 'Delete':
        case 'Backspace':
            event.preventDefault();
            alertCancelBtn.click();
            break;
    }
}

/**
 * 自作アラート関数（Promise対応）
 */
function originalAlert(title, text, confirmText, cancelText) {
    return new Promise((resolve) => {
        alertTitle.textContent = title;
        alertText.textContent = text;
        alertConfirmBtn.textContent = confirmText;
        alertCancelBtn.textContent = cancelText;

        customAlert.style.display = 'flex';
        alertConfirmBtn.focus();

        // ボタンのクリックイベントはここで一時的に設定
        alertConfirmBtn.onclick = () => {
            customAlert.style.display = 'none';
            resolve(true);
        };
        alertCancelBtn.onclick = () => {
            customAlert.style.display = 'none';
            resolve(false);
        };
    });
}