//自分自身の情報を入れる箱
const IAM = {
  token: null,    // トークン
  name: null,     // 名前
  is_join: false  // 入室中？
};

// メンバー一覧を入れる箱
const MEMBER = {
  0: "マスター"
};

// Socket.ioのクライアント用オブジェクトをセット
const socket = io();

let waitingPeople = 0;

//-------------------------------------
// STEP1. Socket.ioサーバへ接続
//-------------------------------------
/**
 * [イベント] トークンが発行されたら
 */
socket.on("token", (data)=>{
  // トークンを保存
  IAM.token = data.token;

  // 表示を切り替える
  if( ! IAM.is_join ){
    $("#nowconnecting").style.display = "none";   // 「接続中」を非表示
    $("#inputmyname").style.display = "block";    // 名前入力を表示
    $("#txt-myname").focus();
  }
});

//-------------------------------------
// STEP2. 名前の入力
//-------------------------------------
/**
 * [イベント] 名前入力フォームが送信された
 */
$("#frm-myname").addEventListener("submit", (e)=>{
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  // 入力内容を取得する
  const myname = $("#txt-myname");
  if( myname.value === "" ){
    return(false);
  }

  // 名前をセット
  $("#myname").innerHTML = myname.value;
  IAM.name = myname.value;

  // Socket.ioサーバへ送信
  socket.emit("join", {token:IAM.token, name:IAM.name});

  // ボタンを無効にする
  $("#frm-myname button").setAttribute("disabled", "disabled");
});

/**
 * [イベント] 入室結果が返ってきた
 */
socket.on("join-result", (data)=>{
  //------------------------
  // 正常に入室できた
  //------------------------
  if( data.status ){
    // 入室フラグを立てる
    IAM.is_join = true;

    //addMemberList(IAM.token, IAM.name);

    // すでにログイン中のメンバー一覧を反映
    for(let i=0; i<data.list.length; i++){
      const cur = data.list[i];
      if( ! (cur.token in MEMBER) ){
        addMemberList(cur.token, cur.name);
      }
    }

    waitingPeople = Number(data.list.length);
    $("#waiting_people").innerHTML = "待機中："+ waitingPeople +"人";

    // 表示を切り替える
    $("#inputmyname").style.display = "none";   // 名前入力を非表示
    $("#Lobby").style.display = "block";        // 待機画面を表示
  }
  //------------------------
  // できなかった
  //------------------------
  else{
    alert("入室できませんでした");
  }

  // ボタンを有効に戻す
  $("#frm-myname button").removeAttribute("disabled");
});

/**
 * [イベント] 退室ボタンが押された
 */
$("#frm-quit").addEventListener("submit", (e)=>{
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  if( confirm("本当に退室しますか？") ){
    // Socket.ioサーバへ送信
    socket.emit("quit", {token:IAM.token});

    // ボタンを無効にする
    $("#frm-quit button").setAttribute("disabled", "disabled");
  }
});

/**
 * [イベント] 退室処理の結果が返ってきた
 */
socket.on("quit-result", (data)=>{
  if( data.status ){
    gotoSTEP1();
  }
  else{
    alert("退室できませんでした");
  }

  // ボタンを有効に戻す
  $("#frm-quit button").removeAttribute("disabled");
});

/**
 * [イベント] 誰かが入室した
 */
socket.on("member-join", (data)=>{
  if( IAM.is_join ){
    addMemberList(data.token, data.name);
    waitingPeople++;
    $("#waiting_people").innerHTML = "待機中："+ waitingPeople +"人";
  }
});

/**
 * [イベント] 誰かが退室した
 */
socket.on("member-quit", (data)=>{
  if( IAM.is_join ){
    removeMemberList(data.token);
    waitingPeople--;
    $("#waiting_people").innerHTML = "待機中："+ waitingPeople +"人";
  }
});

/**
 * [イベント] ゲーム開始
 */
socket.on("over-people", (data)=>{
  // 表示を切り替える
  $("#Lobby").style.display = "none";   // 名前入力を非表示
  $("#Game").style.display = "block";        // 待機画面を表示

  let count = 0;
  for(let i=0; i<data.list.length; i++){
    console.log(i);
    if(data.list[i].origin !== IAM.token){
      if(count == 0){
        $("#firstman-hands").innerHTML = data.list[i].name;
        count = 1;
      }
      else if(count == 1){
        $("#secondman-hands").innerHTML = data.list[i].name;
        count = 2;
      }
      else if(count == 2){
        $("#thirdman-hands").innerHTML = data.list[i].name;
      }
    }
  }
});

/**
 * [イベント] 決定ボタンが押された
 */
$("#SendFingersNum").addEventListener("submit", (e)=>{
  // 規定の送信処理をキャンセル(画面遷移しないなど)
  e.preventDefault();

  let finger = document.getElementById("UpFingersNum").value;
  if(finger >= 1){
    let left_hand = document.getElementById("MyLHands_Image");
    left_hand.src = "Image/Lfinger_down.png";
  }
  if(finger == 2){
    let right_hand = document.getElementById("MyRHands_Image");
    right_hand.src = "Image/Rfinger_down.png";
  }

  socket.emit("finger-set", {token:IAM.token, finger:finger})
});

/**
 * [イベント]全員の指の数を合計した数字を表示
 */
socket.on("open-hands", (data)=>{
  console.log(data.finger);
  $("#open-hands").innerHTML = data.finger;
});

/**
 * 最初の状態にもどす
 *
 * @return {void}
 */
function gotoSTEP1(){
  // NowLoadingから開始
  $("#nowconnecting").style.display = "block";  // NowLoadingを表示
  $("#inputmyname").style.display = "none";     // 名前入力を非表示
  $("#Lobby").style.display = "none";            // チャットを非表示

  // 自分の情報を初期化
  IAM.token = null;
  IAM.name  = null;
  IAM.is_join = false;

  // メンバー一覧を初期化
  for( let key in MEMBER ){
    if( key !== "0" ){
      delete MEMBER[key];
    }
  }

  // チャット内容を全て消す
  $("#txt-myname").value = "";     // 名前入力欄 STEP2
  $("#myname").innerHTML = "";     // 名前表示欄 STEP3
  $("#memberlist").innerHTML = ""; // メンバーリスト STEP3

  // Socket.ioサーバへ再接続
  socket.close().open();
}

/**
 * チャットマスターの発言
 *
 * @param {string} msg
 * @return {void}
 */
function addMessageFromMaster(msg){
  addMessage({token: 0, text: msg});
}


/**
 * メンバーリストに追加
 *
 * @param {string} token
 * @param {string} name
 * @return {void}
 */
function addMemberList(token, name){
  const list = $("#memberlist");
  const li = document.createElement("li");
  li.setAttribute("id", `member-${token}`);
  if( token == IAM.token ){
    li.innerHTML = `<span class="member-me">${name}</span>`;
  }
  else{
    li.innerHTML = name;
  }

  // リストの最後に追加
  list.appendChild(li);

  // 内部変数に保存
  MEMBER[token] = name;
}

/**
 * メンバーリストから削除
 *
 * @param {string} token
 * @return {void}
 */
function removeMemberList(token){
  const id = `#member-${token}`;
  if( $(id) !== null ){
    $(id).parentNode.removeChild( $(id) );
  }

  // 内部変数から削除
  delete MEMBER[token];
}