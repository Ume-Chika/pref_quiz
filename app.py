from flask import Flask, jsonify, render_template
import json
import random

# Flaskアプリの初期化
# static_folderとtemplate_folderのパスを指定します
app = Flask(__name__,
            static_folder='static',
            template_folder='templates')

# --- 1. Webページ本体を返す ---
@app.route('/')
def index():
    """トップページ (index.html) を表示する"""
    return render_template('index.html')

# --- 2. クイズデータを返すAPI (修正版) ---
@app.route('/api/quiz')
def get_quiz():
    """クイズデータを動的に生成して、JSON形式で返す"""
    # JSONファイルを読み込む
    with open('quizzes.json', 'r', encoding='utf-8') as f:
        all_quizzes = json.load(f)

    all_ids = list(all_quizzes.keys()) # すべてのIDのリスト
    correct_id = random.choice(all_ids) # クイズにする県のID

    quiz_data = all_quizzes[correct_id] # クイズの県のデータ取得
    correct_answer_name = quiz_data['correctAnswer'] # クイズの県の県名を取得

    wrong_ids = [i for i in all_ids if i != correct_id] # 不正解リスト
    selected_wrong_ids = random.sample(wrong_ids, 3) # 不正解リストのうち、3つ選択

    choices = [all_quizzes[i]['correctAnswer'] for i in selected_wrong_ids] # 選択肢の作成
    choices.append(correct_answer_name)
    random.shuffle(choices) # シャッフル

    response_data = {
        'image_path': quiz_data['image_path'],
        'correctAnswer': correct_answer_name,
        'choices': choices  # 動的に生成した選択肢
    }

    # 6. 作成したクイズデータをJSONとして返す
    return jsonify(response_data)

# このファイルが直接実行されたときにサーバーを起動
if __name__ == '__main__':
    app.run(debug=True, port=5001) # 開発中はdebug=Trueが便利