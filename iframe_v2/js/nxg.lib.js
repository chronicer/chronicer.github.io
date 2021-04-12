'use strict';
var Feedback = function(params){
var self = this;
this.RESET_TIMEOUT_INTERVAL = 3 * 60 * 1000;
this.resetTimeoutActive = false;
this.zendeskUrl = '../feedback/zendesk/index.php?request=';
this.init(params);
this.defaultLanguage = 'ru';
this.defaultArticles = [
{
id    : -2,
tags  : 'обнова, акция, абнава, когда, кагда, конкурс, результат конкурса, акцыя, акциа',
title : '<b>Когда обновление, акция и т.д.?</b>',
body  : 'Уважаемые игроки, обо всех акциях, обновлениях, конкурсах и других мероприятиях, которые проводятся в официальной группе приложения - вы можете узнать в официальной группе приложения. Следите за новостями! '
},
{
id    : -1,
tags  : 'черный, бан, блокировка, групп, блакировка, чорный, списак, список, когда разбанят, разбан, на сколько, срок блокировки',
title : '<b>Черный список, блокировка в группе</b>',
body  : 'Вы были занесены в черный список группы за нарушение Правил группы.<br/>Разблокировка происходит автоматически, по истечению срока блокировки.<br/>Преждевременная разблокировка не производится.<br/>Срок действующей блокировки указан в группе, в которой Вы занесены в черный список.'
}
];
this.trailerOpened = false;
this.feedbackOpened = false;
this.messages = {
en : {
messageSent : 'Message sent<br/>You\'ll get an answer by email.',
error : 'Send error<br/>Retry later, please.',
errorDescription : 'Description too short.',
errorEmail : 'Invalid email.',
errorWait : 'Send interval must be at least 3 minutes',
noSearchResults : '<p>No matches found for «{pattern}»</p>'+
'<br/><br/><p>Please try the following:</p>'+
'<ul><li class="not-found">Check spelling</li><li class="not-found">Use more generic terms</li></ul>' +
'<br/><br/><p>Still have not found an answer?</p>'+
'<ul><li class="not-found form-search-ask">Submit your question!</li></ul>'
},
ru : {
messageSent : 'Сообщение отправлено.<br/>В ближайшее время вы получите ответ<br/>на указанный электронный адрес почты.',
error : 'Во время отправки возникла ошибка<br/>Попробуйте повторить позже.',
errorDescription : 'Опишите проблему подробней.',
errorEmail : 'Проверьте введенный email.',
errorWait : 'Интервал между отправкой сообщений не может быть меньше трех минут!',
noSearchResults : '<p>Поиск по запросу «{pattern}» не дал результатов.</p>'+
'<br/><br/><p>Попробуйте поискать вот так:</p>'+
'<ul><li class="not-found">Проверьте, правильно ли написаны все слова</li><li class="not-found">Попробуйте использовать более общие термины</li></ul>' +
'<br/><br/><p>Все еще не нашли ответ?</p>'+
'<ul><li class="not-found form-search-ask">Отправьте вопрос в тех. поддержку</li></ul>'
},
get : function(type, placeholders){
var tmp = null;
if (this[self.language] && this[self.language][type]) tmp = this[self.language][type];
else if (this[self.defaultLanguage] && this[self.defaultLanguage][type]) tmp = this[self.defaultLanguage][type];
if (!tmp) return type;
if (placeholders) {
for (var i in placeholders) {
tmp = tmp.replace('{'+ placeholders[i].key +'}', placeholders[i].value);
}
}
return tmp;
}
};
};
Feedback.prototype.appByName = function(name){
return window.document[name] || window[name] || document.embeds[name];
};
Feedback.prototype.flashvars = function(flashvar){
var result = {},
flashvarsString = this.flashApp.querySelector('param[name="flashvars"]').value;
decodeURIComponent(flashvarsString).split('&').forEach(function(item){
var tmp = item.split('=');
result[ tmp[0] ] = tmp[1];
});
return flashvar ? result[flashvar] : result;
};
Feedback.prototype.formShow = function(){
this.feedbackOpened = true;
var form = document.getElementById('zd_form'),
game = form.querySelector('input[name="fields[21727158]"]').value,
li = form.querySelectorAll('.form-feedback-selectbox li');
for (var i = 0, l = li.length; i < l; i++){
var disabledIn = li[i].getAttribute('data-disabled-in'),
enabledIn = li[i].getAttribute('data-enabled-in');
if (!disabledIn && !enabledIn) continue;
var hide = !((enabledIn === game && disabledIn !== game) || (disabledIn !== game && !enabledIn));
li[i].classList.toggle('disable', hide);
}
var itemsCount = form.querySelectorAll('.form-feedback-selectbox li:not(.disable)').length;
form.querySelector('.form-feedback-selectbox').style.maxHeight = (34 * (itemsCount + 1)) - 4 + 'px';
this.search('', '.overview');
form.querySelector('.form-search-field').value = '';
form.querySelector('.form-search-clear').classList.add('element-hide');
form.style.display = 'block';
var title = form.querySelector('.form-title');
title.textContent = title.getAttribute('data-form-search');
form.querySelector('.form-search').style.display = this.articlesStatus === 'disabled' ? 'none' : 'block';
form.querySelector('.form-feedback').style.display = this.articlesStatus === 'disabled' ? 'block' : 'none';
this.hideApp();
if (this.scrollbar) {
this.scrollbar.tinyscrollbar_update();
} else {
this.scrollbar = $('.form .content').tinyscrollbar();
}
};
Feedback.prototype.formHide = function(){
this.feedbackOpened = false;
document.getElementById('zd_form').style.display = 'none';
this.showApp();
};
Feedback.prototype.trailerShow = function(){
this.trailerOpened = true;
var iframe = document.getElementById('trailer'),
src = iframe.getAttribute('data-' + (this.language === 'ru' ? 'ru-src' : 'en-src'));
iframe.setAttribute('src', src);
document.querySelector('.trailer-wrapper').style.display = 'block';
this.hideApp();
};
Feedback.prototype.trailerHide = function(){
this.trailerOpened = false;
document.querySelector('.trailer-wrapper').style.display = 'none';
this.showApp();
};
Feedback.prototype.createTicket = function(){
var self = this;
var error = null;
var MIN_TEXT_LENGTH = 10;
var EMAIL_VALIDATION_REGEX = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
if (this.resetTimeoutActive === false || this.resetTimeoutActive < (new Date).getTime()) {
this.resetTimeoutActive = false;
var form = document.getElementById('zd_form');
var text = form.querySelector('textarea[name="description"]').value;
if (text.length > MIN_TEXT_LENGTH) {
var email = form.querySelector('input[name="email"]').value;
if (EMAIL_VALIDATION_REGEX.test(email.toLowerCase())) {
var subject = form.querySelector('input[name="subject"]').value,
name = form.querySelector('input[name="name"]').value,
field21707382 = form.querySelector('input[name="fields[21707382]"]').value,
field21727158 = form.querySelector('input[name="fields[21727158]"]').value,
field21727488 = form.querySelector('.form-feedback-selectbox-value').getAttribute('data-value'),
field24852608 = form.querySelector('input[name="fields[24852608]"]').value;
var flashPlayer = (function(){
try {
if(window.ActiveXObject) {
var control = null;
control = new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
if (control) return 'Shockwave Flash ' + control.GetVariable('$version');
} else {
for(var i in navigator.plugins) {
var plugin = navigator.plugins[i];
if (plugin.name.match(/flash/i)) return plugin.description;
}
}
} catch(e) {}
return undefined;
})();
var browser = (function(){
var ua= navigator.userAgent,
tem,
M= ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*([\d\.]+)/i) || [];
if(/trident/i.test(M[1])){
tem= /\brv[ :]+(\d+(\.\d+)?)/g.exec(ua) || [];
return 'IE '+(tem[1] || '');
}
M= M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
if (typeof window.opera !== 'undefined')
return 'Opera ' + window.opera.version();
else
return M.join(' ');
})();
var f = this.flashvars();
$.post( this.zendeskUrl + '/tickets/create', {
ssl : window.location.protocol,
browser : browser,
localtime : (new Date).toString(),
subject : subject,
name : name,
email : email,
description : text,
flashplayer : flashPlayer,
params : {
network : f.network,
rpc_url : f.rpc_url,
user_id : f.uid,
app_id : f.api_id || f.application_key || f.app_id
},
fields : {
21707382 : field21707382,
21727158 : field21727158,
21727488 : field21727488
}
}, function(){
self.resetTimeoutActive = (new Date).getTime() + self.RESET_TIMEOUT_INTERVAL;
document.querySelector('#zd_submit').removeAttribute('disabled');
self.showMessage({ type : 'success', message : 'messageSent', autoHide : true });
}, 'json');
} else error = 'errorEmail';
} else error = 'errorDescription';
} else error = 'errorWait';
if (error) {
document.querySelector('#zd_submit').removeAttribute('disabled');
this.showMessage({ type : 'error', message : error, autoHide : false });
}
};
Feedback.prototype.showMessage = function(params){
var MESSAGE_HIDE_DELAY = 3 * 1000;
var type = params.type || 'info';
var message = this.messages.get(params.message || '');
var autoHide = typeof params.autoHide !== 'undefined' ? params.autoHide : true;
var messageHTML = document.createElement('div');
var messageText = document.createElement('p');
messageText.innerHTML = message;
messageHTML.appendChild(messageText);
messageHTML.setAttribute('id', 'message');
messageHTML.classList.add(type);
var body = document.getElementsByTagName('body')[0],
firstChild = body.firstChild;
body.insertBefore(messageHTML, firstChild);
var timeout = setTimeout(function(){
clearTimeout(timeout);
var msg = document.getElementById('message');
msg.parentNode.removeChild(msg);
}, MESSAGE_HIDE_DELAY);
messageHTML.addEventListener('click', function(){
clearTimeout(timeout);
var msg = document.getElementById('message');
msg.parentNode.removeChild(msg);
}, false);
if (autoHide) this.formHide();
};
Feedback.prototype.search = function(pattern, container) {
var searchPattern = pattern.trim(),
overview = document.querySelector(container),
overviewFirstChild = overview.firstChild;
overview.innerHTML = '';
document.querySelector('.form-search-clear').classList.toggle('element-hide', !searchPattern.length);
var articles = this.articles || this.defaultArticles;
for (var i in articles) {
if (articles.hasOwnProperty(i)) {
var li = document.createElement('li');
li.setAttribute('data-url', articles[i].url);
li.setAttribute('data-id', articles[i].id);
li.innerHTML = articles[i].title;
li.classList.add('matched');
if (searchPattern === '') {
overview.appendChild(li);
} else {
var r = new RegExp(searchPattern, "gim");
if (r.test(articles[i].title)) overview.appendChild(li);
}
}
}
if (!overview.hasChildNodes()) overview.innerHTML = this.messages.get('noSearchResults', [ { key : 'pattern', value : searchPattern } ]);
if (this.scrollbar) { this.scrollbar.tinyscrollbar_update(); }
else { this.scrollbar = $('.form .content').tinyscrollbar(); }
};
Feedback.prototype.subscribe = function(){
var self = this;
var searchField = document.querySelector('.form-search-field'),
searchFieldClearButton = document.querySelector('.form-search-clear'),
formCloseButton = document.querySelector('.form-cross'),
formSubmitButton = document.querySelector('#zd_submit');
searchField.addEventListener('focus', function(){
document.querySelector('.form-search-clear').classList.add('element-add-border');
}, false);
searchField.addEventListener('blur', function(){
document.querySelector('.form-search-clear').classList.remove('element-add-border');
}, false);
searchFieldClearButton.addEventListener('click', function(){
var searchField = document.querySelector('.form-search-field');
searchField.value = '';
self.search('', '.overview');
this.classList.add('element-hide');
}, false);
formCloseButton.addEventListener('click', function(){
self.formHide();
}, false);
formSubmitButton.addEventListener('click', function(){
var button = this;
button.setAttribute('disabled', 'disabled');
self.createTicket();
}, false);
document.addEventListener('mouseup', function(e){
var container = document.querySelector('.form-feedback-selectbox'),
formButton = document.querySelector('.form-search-ask');
if (container !== e.target && e.target.parentNode !== container) container.classList.remove('form-feedback-selectbox-expanded');
else container.classList.toggle('form-feedback-selectbox-expanded', !container.classList.contains('form-feedback-selectbox-expanded'));
if (formButton === e.target) {
var title = document.querySelector('.form-title');
title.classList.remove('faq');
title.textContent = title.getAttribute('data-form-feedback');
if (self.articlesStatus !== 'disabled') {
document.querySelector('.form-feedback').style.display = 'none';
document.querySelector('.form-search').style.display = 'block';
document.querySelector('.form-arrow').style.visibility = 'visible';
} else {
document.querySelector('.form-feedback').style.display = 'block';
document.querySelector('.form-search').style.display = 'none';
document.querySelector('.form-arrow').style.visibility = 'hidden';
}
return;
}
if (typeof e.target.classList !== 'undefined' && (e.target.classList.contains('matched') || e.target.parentNode.classList.contains('matched'))) {
var matchedElement = e.target.classList.contains('matched') ? e.target : e.target.parentNode,
articleId = matchedElement.getAttribute('data-id'),
overview = document.querySelector('.overview'),
article = self.articles.filter(function(element){ return element.id.toString() === articleId; });
if (article[0].body) {
overview.innerHTML = article[0].body;
} else {
overview.innerHTML = '<p style="text-align: center"><span id="ajax-loader"></span></p>';
$.get(self.zendeskUrl + '/article', { article : article[0].id }, function(response){
if (response) {
overview.innerHTML = response;
$(overview).find('img').on('load', function(){
if (!self.scrollbar) { self.scrollbar = $('.form .content').tinyscrollbar(); }
else { self.scrollbar.tinyscrollbar_update(); }
});
if (self.scrollbar) self.scrollbar.tinyscrollbar_update();
}
});
}
document.querySelector('.form-search-field').value = matchedElement.textContent.replace(/(\<b\>|\<\/b\>)/ig, '');
document.querySelector('.form-search-clear').classList.remove('element-hide');
if (self.scrollbar) self.scrollbar.tinyscrollbar_update();
return;
}
if (e.target.parentNode && e.target.parentNode.parentNode && e.target.parentNode.parentNode === container) {
var selectBox = document.querySelector('.form-feedback-selectbox-value');
selectBox.textContent = e.target.textContent;
selectBox.setAttribute('data-value', e.target.getAttribute('data-value'));
return;
}
}, false);
document.querySelector('.form-arrow').addEventListener('click', function(){
document.querySelector('.form-search').style.display = 'block';
document.querySelector('.form-feedback').style.display = 'none';
this.style.visibility = 'hidden';
var title = document.querySelector('.form-title');
title.textContent = title.getAttribute('data-form-search');
title.classList.add('faq');
}, false);
document.getElementById('button_q').addEventListener('click', function(e){
e.preventDefault();
self.formShow();
}, false);
['keyup', 'change'].forEach(function(event){
searchField.addEventListener(event, function(){
self.search(this.value, '.overview');
if (this.scrollbar) { this.scrollbar.tinyscrollbar_update(); }
else { this.scrollbar = $('.form .content').tinyscrollbar(); }
}, false);
});
};
Feedback.prototype.hideApp = function(){
if (this.hideFlashCallback) {
this.hideFlashCallback();
} else if (!this.isOpaque) {
this.flashApp.parentNode.style.top = '-10000px';
}
};
Feedback.prototype.showApp = function(){
if (this.showFlashCallback) {
this.showFlashCallback();
} else if (!this.isOpaque && !this.feedbackOpened && !this.trailerOpened) {
this.flashApp.parentNode.style.top = '0';
}
};
Feedback.prototype.init = function(params){
var self = this;
this.categoryId = params.categoryId || null;
this.subscribe();
if (params.zendeskUrl) this.zendeskUrl = params.zendeskUrl;
if (this.categoryId) {
var articlesCache = localStorage.getItem('nexters.articles.' + this.categoryId);
if (!articlesCache) {
this.articlesStatus = 'loading';
$.get(this.zendeskUrl + '/articles', {
category : this.categoryId
}, function(response){
if (response) {
self.articles = self.defaultArticles.concat(response);
localStorage.setItem('nexters.articles.' + self.categoryId, JSON.stringify(self.articles));
self.search('', '.overview');
self.articlesStatus = 'ready';
}
});
} else {
self.articles = JSON.parse(articlesCache);
self.search('', '.overview');
self.articlesStatus = 'ready';
}
} else {
this.articlesStatus = 'disabled';
}
this.flashApp = this.appByName(params.flashApp || 'flash-app');
this.isOpaque = (this.flashApp.querySelector('param[name="wmode"]').value === 'opaque');
this.language = this.flashvars('interface_lang');
this.hideFlashCallback = params.hideFlashCallback || null;
this.showFlashCallback = params.showFlashCallback || null;
};
$(document).ready(function(){
$('body').on('click', '#link_policy, #link_terms', function(e){
e.preventDefault();
if (feedback && feedback.settings && feedback.settings.version === 2) {
return false;
}
var policy = $(this).attr('id') === 'link_policy',
container = $( policy ? '.policy' : '.terms' ),
endPoint = '../../feedback/' + ( policy ? 'privacypolicy.php' : 'termsofservice.php' ),
appTitle = $('meta[property="og:title"]').attr('content');
$('.content', container).load(endPoint, function(){
feedback.hideApp();
container.html( container.html().replace(/{project}/gi, appTitle) ).fadeIn();
});
});
$('body').on('click', '.link_close', function(e){
if (feedback && feedback.settings && feedback.settings.version === 2) {
return false;
}
feedback.showApp();
e.preventDefault();
e.target.parentNode.style.display = 'none';
});
$('.trailer-watch').on('click', function(e){
e.preventDefault();
feedback.trailerShow();
});
$('.trailer-close').on('click', function(e){
e.preventDefault();
feedback.trailerHide();
});
$(document).on('onContextMenu', function(e){
e.preventDefault();
return false;
});
});
window.nxg = {};
window.progrestar = window.nxg;
nxg.modules = {};
nxg.flashMovie = null;
nxg.getModule = function(name) {
if(!nxg.modules[name]) {
throw 'Module ' + name + ' not found';
}
return nxg.modules[name];
};
nxg.checkModule = function(name) {
if(!nxg.modules[name]) {
return false;
}
return true;
};
nxg.registerModule = function(name, object) {
nxg.modules[name] = object;
};
nxg.flashGate = {
handlers: {}
};
nxg.flashGate.on = function(module, event, handlerCb) {
if(!nxg.flashGate.handlers[module]) {
nxg.flashGate.handlers[module] = {};
}
if(!nxg.flashGate.handlers[module][event]) {
nxg.flashGate.handlers[module][event] = [];
}
nxg.flashGate.handlers[module][event].push(handlerCb);
};
nxg.flashGate.emit = function(module, event, params) {
var handlers;
if (!nxg.flashGate.handlers[module]) {
return;
}
if (!nxg.flashGate.handlers[module][event]) {
return;
}
handlers = nxg.flashGate.handlers[module][event];
setTimeout(function() {
for (var i = 0; i < handlers.length; i++) {
handlers[i](params);
}
}, 1);
};
nxg.flashGate.started = function(module, handlers) {
var m;
try {
if (handlers) {
for(var event in handlers) {
(function(module, event, handler) {
nxg.flashGate.on(
module,
event,
function(params) {
var movie = nxg.flashMovie;
if (movie && movie[handler]) {
movie[handler](event, params, module);
}
}
)
})(module, event, handlers[event]);
}
}
m = nxg.getModule(module);
m.flashStarted();
} catch(e) {
}
return {success: true};
};
nxg.setFlashMovie = function(movie) {
this.flashMovie = movie;
};
nxg.ownEvents = {
events: {}
};
nxg.ownEvents.ownEvent = function(eventName) {
this.eventName = eventName;
this.callbacks = [];
this.registerCallback = function(callback) {
this.callbacks.push(callback);
}
this.unregisterCallback = function(callback) {
var index = this.callbacks.indexOf(callback);
if (index > -1) {
this.callbacks.splice(index, 1);
}
}
this.fire = function(data) {
var callbacks = this.callbacks.slice(0);
setTimeout(function() {
callbacks.forEach(function(callback) {
callback(data);
});
}, 1);
}
};
nxg.ownEvents.on = function(eventName, callback) {
var event = nxg.ownEvents.events[eventName];
if (!event) {
event = new nxg.ownEvents.ownEvent(eventName);
nxg.ownEvents.events[eventName] = event;
}
event.registerCallback(callback);
};
nxg.ownEvents.off = function(eventName, callback) {
var event = nxg.ownEvents.events[eventName];
if (event && event.callbacks.indexOf(callback) > -1) {
event.unregisterCallback(callback);
if (event.callbacks.length === 0) {
delete nxg.ownEvents.events[eventName];
}
}
};
nxg.ownEvents.emit = function(eventName, data) {
var event = nxg.ownEvents.events[eventName];
if (event) {
event.fire(data);
}
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.Chronometry = function(params) {
for (var param in params) {
this[param] = params[param];
}
this.results = [];
this.min = 0;
};
nxg.Chronometry.prototype.sendRequest = function(countdown) {
var self = this;
if (countdown > 0) {
var requestStartTime = $.now() / 1000;
$.ajax({
url : this.requestUrl + '?_=' + $.now(),
type : 'GET',
success : function(requestServerTime){
var requestEndTime = $.now() / 1000;
var serverTime = requestEndTime - (requestEndTime - requestStartTime) / 2 - requestServerTime * 1;
self.results.push(serverTime.toFixed(3));
if (self.debug) {
console.log(' - requests queue = ' + (countdown - 1));
}
self.sendRequest(countdown - 1);
}
});
} else {
}
};
nxg.Chronometry.prototype.measure = function() {
var countdown = this.requestCount;
return this.sendRequest(countdown);
};
nxg.Chronometry.prototype.minimal = function() {
if (this.results.length > 0) {
var minTmp = this.results[0];
for (var i = 0; i < this.results.length; i++) {
if (this.results[i] < minTmp) {
minTmp = this.results[i];
}
}
this.min = minTmp;
}
return this.min;
};
nxg.Chronometry.prototype.flashEmit = function(event, parameters) {
nxg.flashGate.emit('time', event, parameters);
};
nxg.Chronometry.prototype.flashStarted = function() {
this.flashEmit('minimal');
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.ErrordClient = function(networkIdent, applicationId, userId, gateUrl) {
var networkIds = {
vkontakte     : 1,
mail          : 2,
odnoklassniki : 3,
facebook      : 4,
mg            : 2
};
this.gateUrl = gateUrl;
this.queue = new nxg.JsonpRequestsAgent(this.gateUrl, null, null, 'POST');
this.networkIdent = networkIdent;
this.networkId = networkIds[networkIdent];
this.applicationId = applicationId;
this.userId = userId;
};
nxg.ErrordClient.flashStarted = function() {
};
nxg.ErrordClient.prototype.send = function(error) {
error.network_id = this.networkId;
error.app_id = this.applicationId;
error.user_id = this.userId;
return this.queue.send(error);
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.friendsOnline = function(params) {
var self = this;
for (var param in params) {
this[param] = params[param];
}
this.uid = parseInt(this.uid, 10);
if (!this.debug) {
console.log('[o] debug off');
}
};
nxg.friendsOnline.prototype.run = function() {
var self = this;
setTimeout(function(){
self.batchExec();
}, 60000);
};
nxg.friendsOnline.prototype.processResponse = function(response) {
if (response && response.error) {
console.log(response.error);
}
};
nxg.friendsOnline.prototype.sendToFlash = function(friends) {
var data;
var dbinary;
var dblob;
var oReq;
if (window.pako && window.pako.deflate) {
data = JSON.stringify({
online: friends,
aid : this.aid,
myId : this.uid
});
dbinary = window.pako.deflate(data);
dblob = new Blob([dbinary], {type: 'text/plain'});
oReq = new XMLHttpRequest();
oReq.open("POST", 'https://online.nextersglobal.com/online/vkontakte/put', true);
oReq.onload = function (oEvent) {
};
oReq.send(dblob);
}
if (this.debug) {
console.log(data);
}
};
nxg.friendsOnline.prototype.batchExec = function() {
var self = this;
var requestString = [];
var resultArr = [];
if (this.list.length <= 0) {
return;
}
for (var i = 0; i < this.count; i++) {
if (this.list.length <= 0) {
break;
}
var tmpid = this.list.shift();
if (!tmpid) {
continue;
}
requestString.push('"' + tmpid + '": API.friends.getOnline({user_id : ' + tmpid + ', online_mobile: 1}) ');
}
VK.api('execute', {
code : 'return {' + requestString.join() + '};'
}, function(resp) {
if (!resp || !resp.response) {
return;
}
let items = resp.response;
for (let item in items) {
if (!items[item]) {
continue;
}
if (items[item].online && items[item].online.length > 0) {
resultArr = resultArr.concat(items[item].online);
}
}
self.sendToFlash(resultArr);
if (self.list.length > 0) {
setTimeout(function(){
self.batchExec();
}, self.interval);
}
});
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.JsonpRequestsAgent = function(gateUrl, maxQueueSize, serverTimeout, method) {
this.gateUrl = gateUrl;
this.serverTimeout = serverTimeout || 10000;
this.maxQueueSize = maxQueueSize || 1000;
this.method = method || 'GET';
this.queue = [];
this.isStopped = true;
};
nxg.JsonpRequestsAgent.prototype.send = function(item) {
if (this.queue.length > this.maxQueueSize) {
return false;
}
if (item === undefined) {
return false;
}
this.queue.push(item);
if (this.isStopped === true) {
this._continue();
}
return true;
};
nxg.JsonpRequestsAgent.prototype._continue = function() {
if (!this.queue.length) {
this.isStopped = true;
} else {
this.isStopped = false;
this._sendItem();
}
};
nxg.JsonpRequestsAgent.prototype._sendItem = function() {
var item = this.queue.shift();
var self = this;
$.ajax({
type: this.method,
url: this.gateUrl,
dataType: 'jsonp',
timeout: this.serverTimeout,
data: item,
success: function(json) {
if (json.error !== undefined) {
self.send(item);
}
self._continue();
},
error: function() {
self.send(item);
self._continue();
}
});
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.Math = {};
nxg.Math.shuffle = function(array) {
for(var i=0; i<array.length - 1; i++) {
var offset = (Math.random() * (array.length - i) + i) ^ 0;
var t = array[offset];
array[offset] = array[i];
array[i] = t;
}
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.PushdClient = function(servers, networkIdent, applicationId, userId, authToken) {
this.connected = false;
this.sock = null;
this.handlers = {};
this.messagesHistory = [];
this.servers = servers;
this.networkIdent = networkIdent;
this.applicationId = applicationId;
this.userId = userId;
this.authToken = authToken;
};
nxg.PushdClient.prototype.connect = function() {
var self = this;
this._selectSocketIoServer(
this.servers,
function(serverUrl) {
self._realConnectSocketIo(serverUrl);
},
function() {
self.connected = false;
self.flashEmit('disconnect');
}
)
};
nxg.PushdClient.prototype._selectSocketIoServer = function(serversList, successCb, errorCb) {
var list = serversList.slice();
nxg.Math.shuffle(list);
var tryNext = function(tryOffset) {
var url = list[tryOffset];
if (!url) {
setTimeout(function() {
tryNext(0);
}, 10000);
return;
}
setTimeout(function() {
successCb(url);
}, 1);
};
tryNext(0);
};
nxg.PushdClient.prototype._realConnectSocketIo = function(serverUrl) {
var self = this;
var tryNumber = 1;
serverUrl = serverUrl
+ '?networkIdent=' + encodeURIComponent(this.networkIdent)
+ '&applicationId=' + encodeURIComponent(this.applicationId)
+ '&userId=' + encodeURIComponent(this.userId)
+ '&authToken=' + encodeURIComponent(this.authToken)
var maxReconnectionsCount = 4;
try {
this.sock = io.connect(
serverUrl,
{
'force new connection': true,
'max reconnection attempts': maxReconnectionsCount,
'reconnection delay': Math.floor(Math.random() * 3500) + 500
}
)
} catch(e) {
return false;
}
var _reconnectFailedTimeout = null;
this.sock.on('connect', function() {
if(_reconnectFailedTimeout) {
clearTimeout(_reconnectFailedTimeout);
}
self.emit('connect');
self.flashEmit('connect');
self.connected = true;
tryNumber = 1;
console.log('io.connect');
});
this.sock.on('disconnect', function() {
self.emit('disconnect');
self.flashEmit('disconnect');
self.connected = false;
console.log('io.disconnect');
});
this.sock.on('connect_failed', function() {
console.log('io.connect_failed');
self.emit('disconnect');
self.flashEmit('disconnect');
self.connected = false;
if(_reconnectFailedTimeout) {
clearTimeout(_reconnectFailedTimeout);
}
_reconnectFailedTimeout = setTimeout(onReconnectFailed, 1000);
});
var onReconnectFailed = function() {
self.sock.disconnect();
var reconnectDelay = Math.floor(Math.random() * 5000) + 1500 * tryNumber;
tryNumber++;
setTimeout(function() {
self.connect();
}, reconnectDelay);
};
this.sock.on('reconnecting', function(interval, tryNumber) {
console.log('io.reconnecting', interval, tryNumber);
if(tryNumber >= maxReconnectionsCount) {
if(_reconnectFailedTimeout) {
clearTimeout(_reconnectFailedTimeout);
}
_reconnectFailedTimeout = setTimeout(onReconnectFailed, interval + 1000);
}
});
this.sock.on('reconnect_failed', function() {
console.log('io.reconnect_failed');
});
this.sock.on('error', function() {
console.log('io.error', self.connected);
if(!self.connected) {
self.emit('disconnect');
self.flashEmit('disconnect');
self.connected = false;
} else {
}
});
var antidup = [];
var antidupMaxLength = 100;
this.sock.on('msg', function(data) {
var id = '' + data.type + ':' + data.date + ':' + (data.body ? data.body.id : '');
if (antidup.indexOf(id) !== -1) {
console.log('message duplicate', data);
return;
}
antidup.push(id);
if (antidup.length > antidupMaxLength) {
antidup.shift();
}
self.emit('message', data);
self.flashEmit('message', data);
if (self.messagesHistory !== null && self.messagesHistory.length < 1000) {
self.messagesHistory.push(data);
}
console.log('msg', data);
});
};
nxg.PushdClient.prototype.flashEmit = function(event, parameters) {
nxg.flashGate.emit('pushd', event, parameters);
};
nxg.PushdClient.prototype.flashStarted = function() {
if(this.messagesHistory) {
this.flashEmit('connect');
for(var i=0; i<this.messagesHistory.length; i++) {
this.flashEmit('message', this.messagesHistory[i]);
}
this.messagesHistory = null;
if(this.connected === false) {
this.flashEmit('disconnect');
}
} else {
if (this.connected === true) {
this.flashEmit('connect');
} else if(this.connected === false) {
this.flashEmit('disconnect');
}
}
};
nxg.PushdClient.prototype.emit = function(event, data) {
if(!this.handlers[event]) {
return
}
for(var i=0; i<this.handlers[event].length; i++) {
try {
this.handlers[event][i](data);
} catch(e) {
}
}
};
nxg.PushdClient.prototype.on = function(event, cb) {
if(!this.handlers[event]) {
this.handlers[event] = [];
}
this.handlers[event].push(cb);
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.Pushd3Client = function(servers, networkIdent, applicationId, userId, authToken) {
this.connected = false;
this.sock = null;
this.handlers = {};
this.messagesHistory = [];
this.servers = servers;
this.networkIdent = networkIdent;
this.applicationId = applicationId;
this.userId = userId;
this.authToken = authToken;
this.currentState = null;
this.connecting = false;
};
nxg.Pushd3Client.prototype.setState = function(state) {
console.log('setState', state);
if(this.currentState !== state) {
this.currentState = state;
this.flashEmit(state);
this.emit(state);
}
};
nxg.Pushd3Client.prototype.connect = function() {
if(this.connecting) {
return;
}
this.connecting = true;
var self = this;
var connector = function(url, onDisconnect) {
var sock = new SockJS(url);
sock.onopen = function() {
self.setState('connect');
self.sock = sock;
self.connected = true;
sock.send('subscribe:ping');
};
sock.onmessage = function(data) {
try {
var m = data.data.match(/^(.*?):(.*)$/);
if (!m) {
throw new Error('Wrong message: ' + data.data);
}
var message = {
type: m[1],
body: JSON.parse(m[2])
};
self.emit('message', message);
self.flashEmit('message', message);
if (self.messagesHistory !== null && self.messagesHistory.length < 1000) {
self.messagesHistory.push(message);
}
} catch(e) {
console.log(e);
}
};
sock.onclose = function() {
self.setState('disconnect');
self.sock = null;
self.connected = false;
onDisconnect();
};
};
var reconnectionIntervalDelta = 0.2;
var reconnectionTryNumber = 0;
var randomServer;
var connectionLoop = function() {
if(!reconnectionTryNumber || reconnectionTryNumber > 2) {
randomServer = self.servers[Math.floor(Math.random() * self.servers.length)];
if(!randomServer) {
console.error('No more servers to connect');
self.connecting = false;
return;
}
}
reconnectionTryNumber++;
connector(randomServer, function() {
setTimeout(connectionLoop, Math.floor(reconnectionIntervalDelta * reconnectionTryNumber * 1000));
});
};
self.on('connect', function() {
reconnectionTryNumber = 1;
});
connectionLoop();
};
nxg.Pushd3Client.prototype.flashEmit = function(event, parameters) {
nxg.flashGate.emit('pushd3', event, parameters);
};
nxg.Pushd3Client.prototype.flashStarted = function() {
if(this.messagesHistory && this.messagesHistory.length) {
this.flashEmit('connect');
for(var i=0; i<this.messagesHistory.length; i++) {
this.flashEmit('message', this.messagesHistory[i]);
}
this.messagesHistory = null;
if (this.connected === false) {
this.flashEmit('disconnect');
}
} else {
if (this.connected === true) {
this.flashEmit('connect');
} else if (this.connected === false) {
this.flashEmit('disconnect');
}
}
};
nxg.Pushd3Client.prototype.emit = function(event, data) {
if(!this.handlers[event]) {
return;
}
for (var i=0; i<this.handlers[event].length; i++) {
try {
this.handlers[event][i](data);
} catch(e) {}
}
};
nxg.Pushd3Client.prototype.on = function(event, cb) {
if(!this.handlers[event]) {
this.handlers[event] = [];
}
this.handlers[event].push(cb);
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.StatClient = function(networkIdent, applicationId, userId, sessionId, secretKey, gateUrl) {
this.gateUrl = gateUrl;
this.networkIdent = networkIdent;
this.applicationId = applicationId;
this.userId = userId;
this.sessionId = sessionId;
this.secretKey = secretKey;
this.queue = new nxg.JsonpRequestsAgent(this.gateUrl);
};
nxg.StatClient.flashStarted = function() {
};
nxg.StatClient.prototype.send = function(event, object, value, segment) {
var ts = Math.floor(new Date().getTime() / 1000);
var item = {
data: JSON.stringify(
{
secret: this.secretKey,
date: ts,
data: [
{
event: event,
object: object,
value: value,
date: ts,
segment: segment || []
}
],
network_app_id: this.applicationId,
network_id: this.networkIdent,
sessionId: this.sessionId,
userId: this.userId
}
)
};
return true;
};
if (!window.nxg) {
window.nxg = {};
}
var nxg = window.nxg;
nxg.Timer = function(startPoint, seconds) {
this.startPoint = startPoint || this.time();
this.seconds = seconds || false;
};
nxg.Timer.prototype.time = function() {
return this.seconds ? Math.round(new Date() / 1000) : new Date();
};
nxg.Timer.prototype.get = function(){
return this.time() - this.startPoint;
};
