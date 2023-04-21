// const API_KEY = "API_KEY"
const API_KEY = ""
const NUM_TOKENS = 1024; // 回傳的字數限制
const NOTICE = '青埔國中數資班 111 充實課程';


function chatGPT_API(prompt) {
  var data = {
    'prompt': prompt,
    'max_tokens': NUM_TOKENS,
    "model": "text-davinci-003",
    'temperature': 0.5, // 這邊調整為 0.0-1.0 , 以文件上乍看來說是調整回答是否有彈性或是完全依照答案 
  };

  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(data),
    'headers': {
      Authorization: 'Bearer ' + API_KEY,
    },
  };

  response = UrlFetchApp.fetch(
    'https://api.openai.com/v1/completions',
    options,
  );
  Logger.log(JSON.parse(response.getContentText()));
  return JSON.parse(response.getContentText())['choices'][0]['text'];
}

function onOpen(e) {
  try {
    FormApp.getUi()
      .createAddonMenu()
      .addSeparator()
      .addItem('設定', 'setupTrigger')
      // // .addItem('About', 'showAbout')
      .addToUi();
  } catch (e) {
    // TODO (Developer) - Handle exception
    console.log('onOpen:getUI', e);
  }
}

function onInstall(e) {
  onOpen(e);
}

function setupTrigger() {
  try {
    const form = FormApp.getActiveForm();
    const triggers = ScriptApp.getUserTriggers(form);
    // remove existed trigger for ON_FORM_SUBMIT
    for (let i = 0; i < triggers.length; i++) {
      if (triggers[i].getEventType() === ScriptApp.EventType.ON_FORM_SUBMIT) {
        ScriptApp.deleteTrigger(triggers[i]);
        break;
      }
    }

    // install new trigger for ON_FORM_SUBMIT
    const trigger = ScriptApp
      .newTrigger('onFormSubmit')
      .forForm(form)
      .onFormSubmit()
      .create();
  } catch (e) {
    // TODO (Developer) - Handle exception
    console.log('onOpen', e);
  }

}

function onFormSubmit(e) {
  try {
    const authInfo = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);

    // check AuthorizationStatus
    if (authInfo.getAuthorizationStatus() ===
      ScriptApp.AuthorizationStatus.REQUIRED) {
      // sendReauthorizationRequest();
      console.log('onFormSubmit', e);

    } else {
      // 每天寄信數量有上限，還有數量可寄信才寄信
      if (MailApp.getRemainingDailyQuota() > 0) {
        sendRespondentNotification(e.response);
      }
    }
  } catch (e) {
    // TODO (Developer) - Handle exception
    console.log('onFormSubmit', e);
  }
}

function sendRespondentNotification(response) {
  try {
    const form = FormApp.getActiveForm();
    const settings = PropertiesService.getDocumentProperties();
    const emailItem = form.getItems()[0];   // 第一個問題一定要是問 Email
    const respondentEmail = response.getResponseForItem(emailItem)
      .getResponse();

    let prompts = [];

    if (respondentEmail) {
      // get form response of fields
      prompts.push('請根據我的喜好，推薦我5本書，我的喜好如下:\n');
      let formResponses = form.getResponses();
      for (let i = formResponses.length - 1; i < formResponses.length; i++) {
        let formResponse = formResponses[i];
        let itemResponses = formResponse.getItemResponses();
        for (let j = 0; j < itemResponses.length; j++) {
          let itemResponse = itemResponses[j];
          prompts.push(itemResponse.getItem().getTitle() + ':' + itemResponse.getResponse() + '\n');

          Logger.log('Response #%s to the question "%s" was "%s"',
            (i + 1).toString(),
            itemResponse.getItem().getTitle(),
            itemResponse.getResponse());
        }
      }

      Logger.log('full prompts: ' + prompts.toString());

      // AI magic
      let aiResponse = chatGPT_API(prompts.toString());
      Logger.log('aiResponse: ' + aiResponse);

      const template =
        HtmlService.createTemplateFromFile('respondentNotification');
      template.paragraphs = aiResponse.split('\n');
      template.notice = NOTICE;
      const message = template.evaluate();
      MailApp.sendEmail(respondentEmail,
        '[智慧書單] 結果通知',
        message.getContent(), {
        name: form.getTitle(),
        htmlBody: message.getContent()
      });
    }
  } catch (e) {
    // TODO (Developer) - Handle exception
    console.log(e);
    console.log('[sendRespondentNotification] Failed with error: %s', e.error);
  }
}
