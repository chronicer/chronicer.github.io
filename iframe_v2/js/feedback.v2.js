function NXSetCookie(name, value, days) {
	var date;
	var expires = '';
	if (days) {
		date = new Date();
		date.setTime(date.getTime() + (days*24*60*60*1000));
		expires = '; expires=' + date.toUTCString();
	}
	document.cookie = name + '=' + (value || '') + expires + '; path=/';
}
function NXGetCookie(name) {
	var nameEQ = name + '=';
	var ca = document.cookie.split(';');
	for (var i=0; i < ca.length; i++) {
		var c = ca[i];
		while (c.charAt(0)==' ') {
			c = c.substring(1,c.length);
		}
		if (c.indexOf(nameEQ) == 0) {
			return c.substring(nameEQ.length,c.length);
		}
	}
	return null;
}

$(document).ready(function(){
	var savedStateTS;
	var newVideoTS;
	var ytbutton;
	if (window.NXNewVideos) {
		ytbutton = $('.channel-watch.button');
		if (ytbutton.length > 0) {
			savedStateTS = NXGetCookie('last_youtube_video_time');
			savedStateTS = savedStateTS || 0;
			newVideoTS = parseInt(NXNewVideos[NXFeedbackLang], 10);
			if (newVideoTS > 0) {
				if (newVideoTS <= NXCurrentTimestamp) {
					if (savedStateTS < newVideoTS) {
						ytbutton.addClass('has_new_videos');
					}
				}
			}
		}
	}
});

window.Feedback = window.Feedback || {};

Feedback.Controller = function(options){

	var self = this;

	this.settings = $.extend({
		opaque : false,
		form : '.form',
		movie : '#flash-app',
		trailer : '.trailer-wrapper',
		version : 2,
		language : 'ru',
		formVisible : false,
		trailerVisible : false,
		resetTimeoutId : null,
		resetTimeoutInterval : 3 * 60 * 1000,
		flashHideCallback : null,
		flashShowCallback : null,
		onInvalid : function(settings){
			var msg = 'error' + settings.message;
			self.messages.show({ type : 'error', message : msg, globalFail: settings.globalFail });
			return false;
		},
		onAjaxError: function(){
			if (!self.tooManyInternalErrors) {
				self.tooManyInternalErrors = true;
				self.settings.onInvalid({ message : 'Internal' });
			} else {
				self.settings.onInvalid({ message : 'InternalEnd', globalFail: true });
			}
			self.$form.find('.loader').addClass('hidden');
		},
		validation : {
			minLength : 10
		},
		url : '../feedback/v2/zendesk/index.php?request='
	}, options);

	this.tooManyInternalErrors = false;
	/*
	$.ajaxSetup({
		error: function(){
			if (!self.tooManyInternalErrors) {
				self.tooManyInternalErrors = true;
				self.settings.onInvalid({ message : 'Internal' });
			} else {
				self.settings.onInvalid({ message : 'InternalEnd', globalFail: true });
			}
			self.$form.find('.loader').addClass('hidden');
		}
	});
	*/

	this.messages = new Feedback.Messages({
		language : this.settings.language,
		parent : this.settings.form
	});

	this.termsController = new Feedback.TermsController(this.settings);

	this.$layout = $('body');

	this.$form = $(this.settings.form);
	this.$movie = $(this.settings.movie);
	this.$trailer = $(this.settings.trailer);

	this.$dropbox = this.$form.find('.attachment-wrapper');

	this.$layout.on('click', '[data-action="form-show"]', $.proxy(this.showForm, this));
	this.$layout.on('click', '[data-action="form-hide"]', $.proxy(this.hideForm, this));
	this.$layout.on('click', '[data-action="trailer-show"]', $.proxy(this.showTrailer, this));
	this.$layout.on('click', '[data-action="trailer-hide"]', $.proxy(this.hideTrailer, this));

	this.$layout.on('click', '[data-action="channel-show"]', $.proxy(this.showChannel, this));

	this.$layout.on('contextmenu', function(e){
		e.preventDefault();
		return false;
	});


	this.$form.on('click', '[data-action="form-submit"]', $.proxy(this.createTicket, this));

	this.$form.on('mouseup', function(e){

		e.preventDefault();

		var $self = $(e.target);

		var $selectbox = $self.parents('.form-feedback-selectbox');

		if ($selectbox.length > 0) {

			var selected_type = $self.attr('data-value');
			var selected_child = self.$form.find('[data-field-type="' + selected_type + '"]');
			if (selected_child.length > 0) {
				self.$form.attr('data-selected-type', selected_child.attr('data-value'));
			} else {
				self.$form.attr('data-selected-type', selected_type);
			}

			var selected_value = $selectbox.find('.form-feedback-selectbox-value');
			selected_value.attr('data-value', $self.attr('data-value'));
			if ($self[0] && $self[0].nodeName === 'LI') {
				selected_value.text($self.text());
			}
			$selectbox.attr('data-value', $self.attr('data-value') );

			var show = !$selectbox.hasClass('form-feedback-selectbox-expanded');

			// если открываем один список - скрываем остальные, чтоб не наслаивались
			if (show){
				$self
					.parents('form')
					.find('.form-feedback-selectbox-expanded')
					.removeClass('form-feedback-selectbox-expanded');
			}

			$selectbox.toggleClass('form-feedback-selectbox-expanded', show);

			// если это поле "тип обращения", то нужно показать кастомные поля в зависимости от указанного типа
			if ($selectbox.attr('data-name') === 'type' && !show) {
				$('.form-typical-field').addClass('hidden');
				$self
					.parents('form')
					.find('[data-field-type="' + $selectbox.attr('data-value') + '"]')
					.parent()
					.removeClass('hidden');

			}

		}

		return false;

	});


	$(this.termsController).on('applicationShow', $.proxy(this.applicationShow, this));
	$(this.termsController).on('applicationHide', $.proxy(this.applicationHide, this));


	this.$form.on('change', 'input[name="attachment"]', function(){
		self.saveAttachments(this.files);
	});

	this.$form.on('click', '.attachment-list-item', function(){

		$(this).remove();

		var $input = self.$form.find('input[type="file"]');

		$input.replaceWith( $input.val('').clone(true) );

	});


	this.$dropbox.on('dragenter dragover drop', function(event){
		event.stopPropagation();
		event.preventDefault();
	});

	this.$dropbox.on('drop', function(event){
		var dataTransfer = event.originalEvent.dataTransfer;
		var files = dataTransfer.files;
		self.saveAttachments(files);
	});


	/**
	 * opera mini and ios 8.0 can't upload files via filereader
	 * so let's hide this functionality from users
	 */

	var ua = window.navigator.userAgent;
	var condition = /(opera mini)|(os 8_0 like mac os x)/i;

	if (condition.test(ua) || (typeof window.FileReader === 'undefined')) {
		$('.attachment-wrapper').hide();
	}

};
//window.feedback.setGameInternalId(value) //string
Feedback.Controller.prototype.setGameInternalId = function(value) {
	this.$form.find('input[name="fields[360000338947]"]').val(value);
};
//window.feedback.setGameClientVersion(value) //string
Feedback.Controller.prototype.setGameClientVersion = function(value) {
	this.$form.find('input[name="game_client_version"]').val(value);
};

Feedback.Controller.prototype.saveAttachments = function(files){

	var self = this;

	var attachments = [];

	var limit = 5 * 1024 * 1024;

	var totalSize = 0; 

	for (var i = 0; i < files.length; i++){ 
		totalSize += files[i].size; 
	}

	function inputReset(){
		var $input = self.$form.find('input[type="file"]');
		$input.replaceWith( $input.val('').clone(true) );
	}

	if (totalSize > limit) {
		this.settings.onInvalid({ message : 'AttachmentSize' });

		inputReset();

		return false;
	}

	if (files.length > 3) {

		this.settings.onInvalid({ message : 'TooMuchFiles' });

		inputReset();

		return false;

	}

	this.$form.find('.loader').removeClass('hidden');

	var callback = function(attachments){

	    var output = '';

	    attachments.forEach(function(attachment){
		 output += '<li class="attachment-list-item" data-id="' + attachment.token + '">' + attachment.name + ' <span class="attachment-list-item-remove">&times;</span></li>';
	    });

	    self.$form.find('.attachment-list').html(output);

	    self.$form.find('.loader').addClass('hidden');

	    var $input = self.$form.find('input[type="file"]');

	    $input.replaceWith( $input.val('').clone(true) );

	};

	(function saveAttachment(files, index, callback) {

		var file = files[ index ];

		var fileReader = new FileReader();

		if (typeof file !== 'undefined') {

			try {
				fileReader.onload = function(){
					var cb = Date.now();
					$.post(self.settings.url + 'upload&_='+cb, {
						attachment : this.result
					}, function(response){
						if (response && response.upload) {
							attachments.push({
								token : response.upload.token,
								name : file.name || response.upload.attachment.file_name,
								source : response.upload.attachment
							});
						}
						files[ ++index ] ? saveAttachment(files, index, callback) : callback(attachments);
					});
				};

				fileReader.onerror = function(){
					self.settings.onInvalid({ message : 'UploadError' });
					callback(attachments);
				};

				fileReader.readAsDataURL( file );

			} catch(e){
				self.settings.onInvalid({ message : 'UploadError' });
				callback(attachments);
			}

		}

	})( files, 0, callback );

};

Feedback.Controller.prototype.getFlashvars = function(flashvarName){

	var flashvarsString = this.$movie.find('param[name="flashvars"]').val();
	var flashvars = {};

	decodeURIComponent(flashvarsString).split('&').forEach(function(item){
		var flashvar = item.split('=');
		flashvars[ flashvar[0] ] = flashvar[1];
	});

	return flashvarName ? flashvars[flashvarName] : flashvars;

};

Feedback.Controller.prototype.getBrowserVersion = function(){

	var ua = window.navigator.userAgent;

	var browserName  = navigator.appName;
	var fullVersion  = '' + parseFloat(navigator.appVersion);
	var nameOffset, verOffset, ix;

	//opera 15+
	if ((verOffset=ua.indexOf('OPR/'))!==-1) {
		browserName = 'Opera';
		fullVersion = ua.substring(verOffset + 4);
	}

	//old opera
	else if ((verOffset=ua.indexOf('Opera'))!==-1) {
		browserName = 'Opera';
		fullVersion = ua.substring(verOffset+6);
		if ((verOffset=ua.indexOf('Version'))!==-1)
			fullVersion = ua.substring(verOffset+8);
	}

	//ie
	else if ((verOffset=ua.indexOf('MSIE'))!==-1) {
		browserName = 'Microsoft Internet Explorer';
		fullVersion = ua.substring(verOffset+5);
	}

	//chrome
	else if ((verOffset=ua.indexOf('Chrome'))!==-1) {
		browserName = 'Chrome';
		fullVersion = ua.substring(verOffset+7);
	}

	//safari
	else if ((verOffset=ua.indexOf('Safari'))!==-1) {
		browserName = 'Safari';
		fullVersion = ua.substring(verOffset+7);
		if ((verOffset=ua.indexOf('Version'))!==-1)
		    fullVersion = ua.substring(verOffset+8);
	}

	//ff
	else if ((verOffset=ua.indexOf('Firefox'))!=-1) {
		browserName = 'Firefox';
		fullVersion = ua.substring(verOffset+8);
	}

	//other
	else if ((nameOffset=ua.lastIndexOf(' ')+1) < (verOffset=ua.lastIndexOf('/'))) {
		browserName = ua.substring(nameOffset,verOffset);
		fullVersion = ua.substring(verOffset+1);
		if (browserName.toLowerCase()===browserName.toUpperCase()) {
			browserName = navigator.appName;
		}
	}

	// trim the fullVersion string at semicolon/space if present
	if ((ix=fullVersion.indexOf(';'))!==-1) fullVersion=fullVersion.substring(0,ix);
	if ((ix=fullVersion.indexOf(' '))!==-1) fullVersion=fullVersion.substring(0,ix);

	var osName = 'Unknown';

	if (navigator.appVersion.indexOf('Win')!==-1) osName = 'Windows';
	else if (navigator.appVersion.indexOf('Mac')!==-1) osName = 'MacOS';
	else if (navigator.appVersion.indexOf('X11')!==-1) osName = 'Unix';
	else if (navigator.appVersion.indexOf('Linux')!==-1) osName = 'Linux';

	return [ browserName, fullVersion, osName ].join(' ');
};

Feedback.Controller.prototype.validate = function(){

	var text = this.$form.find('textarea[name="description"]').val();

	var email = this.$form.find('input[name="email"]').val().split('@');

	var type = this.$form.find('.form-feedback-selectbox[data-name="type"]').attr('data-value');

	var files = this.$form.find('.attachment-list-item').length;

	if (files.length > 3) {
		return this.settings.onInvalid({ message : 'TooMuchFiles' });
	}

	if (!type) {
		return this.settings.onInvalid({ message : 'Type' });
	}

	//timeout between messages
	if (this.settings.resetTimeout && this.settings.resetTimeout > Date.now()){
		return this.settings.onInvalid({ message : 'Wait' });
	}

	//description not less than 10 symbols
	if (text.length < this.settings.validation.minLength) {
		return this.settings.onInvalid({ message : 'Description' });
	}

	//simple email check
	if (email.length !== 2 || email[0].length === 0 || email[1].length === 0) {
		return this.settings.onInvalid({ message : 'Email' });
	}

	return true;

};

Feedback.Controller.prototype.getFlashplayerVersion = function(){
	return (function(){

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
		} catch(e) {};

		return undefined;
	})();
};

Feedback.Controller.prototype.serializeForm = function(){
	var fields = {};
	var attachments = [];
	var type = this.$form.find('.form-feedback-selectbox[data-name="type"]').attr('data-value');
	var flashvars = this.getFlashvars();
	var userId = this.$form.find('input[name="params[user_id]"]').val() || flashvars.uid || this.$form.find('input[name="name"]').val();

	this.$form.find('.attachment-list-item').each(function(){
		attachments.push( $(this).data('id') );
	});

	fields.attachments  = attachments;
	fields.browser	    = navigator.userAgent; //this.getBrowserVersion(); //navigator.userAgent;
	fields.description  = this.$form.find('textarea[name="description"]').val();
	fields.email	    = this.$form.find('input[name="email"]').val();
	fields.localtime    = (new Date).toString();
	fields.name	    = this.$form.find('input[name="name"]').val();
	fields.ssl	    = window.location.protocol;
	fields.subject	    = this.$form.find('input[name="subject"]').val();
	fields.version	    = this.$form.find('input[name="version"]').val();
	fields.vendor	    = this.$form.find('input[name="vendor"]').val();
	fields.brand_id	    = this.$form.find('input[name="brand_id"]').val();
	fields.userId	    = this.$form.find('input[name="userId"]').val();
	fields.flashplayer  = this.getFlashplayerVersion();
	fields.userId	    = userId;
	fields.game_client_version = this.$form.find('input[name="game_client_version"]').val();

	fields.params = {
		app_id    : this.$form.find('input[name="params[app_id]"]').val() || flashvars.api_id || flashvars.application_key || flashvars.app_id,
		network   : this.$form.find('input[name="params[network]"]').val() || flashvars.network,
		rpc_url   : this.$form.find('input[name="params[rpc_url]"]').val() || flashvars.rpc_url,
		user_id   : userId
	};

	fields.fields = {
		21727158:		this.$form.find('input[name="fields[21727158]"]').val(),
		81086248:		this.$form.find('input[name="fields[81086248]"]').val(),
		21707382:		this.$form.find('input[name="fields[21707382]"]').val(),
		360000338947:	this.$form.find('input[name="fields[360000338947]"]').val(),
		360000059967:	this.$form.attr('data-selected-type')
	};

	fields.network_test = this.$form.find('input[name="network_test"]').val();
	fields.support_token = this.$form.find('input[name="support_token"]').val();
	fields.data_token = this.$form.find('input[name="data_token"]').val();

	return fields;
};

Feedback.Controller.prototype.createTicket = function(){
	if (!this.validate()) {
		return false;
	}
	var self = this;
	this.settings.resetTimeout = false;
	var options = this.serializeForm();

	this.$form.find('[data-action="form-submit"]').attr('disabled', 'disabled');

	this.messages.show({
		type: 'waiting',
		message: 'messageSending',
		isLoader: true
	});

	$.post(this.settings.url + 'create_ticket', options, function() {
		self.settings.resetTimeout = Date.now() + self.settings.resetTimeoutInterval;

		self.$form.find('.attachment-list').html('');
		self.$form.find('input[type="text"], input[type="email"], textarea').val('');

		self.messages.show({
			type: 'success',
			message: 'messageSent',
			callback: function(){ self.hideForm(); }
		});

	}, 'json')
	.fail(self.settings.onAjaxError)
	.always(function() {
		self.$form.find('[data-action="form-submit"]').removeAttr('disabled');
	});

};



Feedback.Controller.prototype.applicationHide = function(){

	if (this.settings.flashHideCallback) {
		return this.settings.flashHideCallback();
	}

	if (!this.settings.opaque) {
		this.$movie.parent().css({ top : -10000 });
	}

};

Feedback.Controller.prototype.applicationShow = function(){

	if (this.settings.flashShowCallback) {
		return this.settings.flashShowCallback();
	}

	if (!this.settings.opaque && !this.$form.is(':visible') && !this.$trailer.is(':visible')) {
		this.$movie.parent().css({ top : 0 });
	}

};


Feedback.Controller.prototype.showChannel = function() {
	var ytbutton = $('.channel-watch.button');
	NXSetCookie('last_youtube_video_time', ((new Date()).getTime() / 1000), 365);
	if (ytbutton.length > 0) {
		ytbutton.removeClass('has_new_videos');
	}
};

Feedback.Controller.prototype.showTrailer = function(){
	//data-src-ru || data-src-en
	var $iframe = this.$trailer.find('iframe');
	$iframe.attr('src', $iframe.attr('data-src-'+this.settings.language));
	this.$trailer.show();
	this.applicationHide();
};

Feedback.Controller.prototype.hideTrailer = function(){
	this.$trailer.hide();
	this.applicationShow();
};

Feedback.Controller.prototype.testNetworks = function(urls) {
	var that = this;
	var flow = [];
	function addResults() {
		that.$form.find('[name="network_test"]').val(JSON.stringify(that.networkTestResult));
	};
	function measure(servers) {
		var image;
		var callbackServer = function(event, ts, timeoutId) {
			var currentTS;
			var name = server.name + ' (' + server.url + ')';
			clearTimeout(timeoutId);
			currentTS = +new Date;
			if (event && event.type && event.type === 'load') {
				ts = ((currentTS - ts) / 1000);
			} else {
				ts = '-';
			}
			that.networkTestResult[name] = that.networkTestResult[name] || [];
			if (that.networkTestResult[name].length < 4) {
				that.networkTestResult[name].push(ts);
			}
			addResults();
			measure(servers);
		};
		var startChecking = function(server) {
			var ts = +new Date;
			var timeoutId = null;
			if (server.type === 'xml') {
				var script = document.createElement('script');
				script.setAttribute('type', 'text/javascript');
				script.setAttribute('src', server.url + '?' + Math.random());
				timeoutId = setTimeout(function(event) {
					callbackServer(event, ts, timeoutId);
				}, 5000);
				script.onload = script.onerror = script.onabort = function(event) {
					callbackServer(event, ts, timeoutId);
				}
				document.body.appendChild(script);
			} else {
				var image = new Image();
				image.onload = image.onerror = image.onabort = function(event) {
					callbackServer(event, ts, timeoutId);
				};
				image.src = server.url + '?' + Math.random();
				timeoutId = setTimeout(function(event) {
					callbackServer(event, ts, timeoutId);
				}, 5000);
			}
		};
		var server = servers.shift();
		if (server) {
			startChecking(server);
		}
	}

	if (!window.nxg) {
		if (window.progrestar) {
			window.nxg = window.progrestar;
		} else {
			window.nxg = {};
		}
	}
	if (nxg.getModule && nxg.getModule('pushd')._status === 'connected') {
		that.networkTestResult['pushd'] = ['connected'];
	} else {
		that.networkTestResult['pushd'] = ['-'];
	}
	
	for (var i = 0; i < urls.length; i++) {
		for (var j = 0; j < 3; j++) {
			flow.push(urls[i]);
		}
	}

	measure(flow);
};


Feedback.Controller.prototype.collectNetworkStatus = function(){
	var that = this;
	var network_testing = $('[name="network_testing"]').val();
	var list = [];
	var server;
	this.networkTestResult = {};
	if (network_testing) {
		network_testing = network_testing.split(';');
		for(var i in network_testing) {
			server = network_testing[i].split('|');
			list.push({
				'name': server[0],
				'url': server[2]
			});
		}
		this.testNetworks(list);
	}
};

Feedback.Controller.prototype.showForm = function(event, callback){

	this.$form.show();
	this.applicationHide();
	setTimeout(this.collectNetworkStatus.bind(this), 1000);

	if (typeof callback === 'function') {
		callback(this.$form);
	}

};

Feedback.Controller.prototype.hideForm = function(){
	this.$form.hide();
	this.applicationShow();
};




Feedback.Messages = function(options){
	this.settings = $.extend({
		language : 'en',
		defaultLanguage : 'en',
		hideDelay : 3 * 1000,
		parent : '.form'
	}, options);
	this.$form = $(this.settings.parent);
	this.$message = this.$form.find('#message');
	this.$message_text = this.$message.find('.message_text');
	this.dictionary = {
		messageSending: {
			en: 'Message sending<br/>Please wait...',
			ru: 'Сообщение отправляется.<br/>Ожидайте...'
		},
		messageSent: {
			en: 'Message sent<br/>You\'ll get an answer by email.',
			ru: 'Сообщение отправлено.<br/>В ближайшее время вы получите ответ<br/>на указанный электронный адрес почты.'
		},
		error: {
			en: 'Send error<br/>Retry later, please.',
			ru: 'Во время отправки возникла ошибка<br/>Попробуйте повторить позже.'
		},
		errorDescription: {
			en: 'Description too short.',
			ru: 'Опишите проблему подробней.'
		},
		errorEmail: {
			en: 'Invalid email.',
			ru: 'Проверьте введенный email.'
		},
		errorWait: {
			en: 'Send interval must be at least 3 minutes',
			ru: 'Интервал между отправкой сообщений не может быть меньше трех минут!'
		},
		errorType: {
			en: 'Specify the type of problem',
			ru: 'Укажите тип проблемы'
		},
		errorAttachmentSize: {
			en: 'Attachments size must be less than 5 megabytes',
			ru: 'Размер вложений не может превышать 5 мегабайт'
		},
		errorUploadError: {
			en: 'Error has occurred during upload',
			ru: 'Во время загрузки произошла ошибка'
		},
		errorTooMuchFiles: {
			en: 'Too much files. Max count of attachments is 3',
			ru: 'Слишком много файлов. Максимальное количество вложений - 3'
		},
		errorInternal: {
			en: 'Oops! Something went wrong trying to send your request.<br>Please try again later.',
			ru: 'Ой! Что-то пошло не так, и ваше сообщение не было отправлено.<br>Пожалуйста, повторите попытку через несколько минут.'
		},
		errorInternalEnd: {
			en: 'Oops! Something went wrong trying to send your request.<br>You can fill this form to send us a message:<br><a href="https://nexters.zendesk.com/hc/en-us/requests/new" target="_blank">https://nexters.zendesk.com/hc/en-us/requests/new</a>',
			ru: 'Ой! Что-то пошло не так, и ваше сообщение не было отправлено.<br>Вы можете прислать нам запрос, заполнив форму по ссылке:<br><a href="https://nexters.zendesk.com/hc/en-us/requests/new" target="_blank">https://nexters.zendesk.com/hc/en-us/requests/new</a>'
		}
	};
};

Feedback.Messages.prototype.get = function(type, placeholders){
	var tmp = null;
	if (this.dictionary[type] && this.dictionary[type][this.settings.language]) {
		tmp = this.dictionary[type][this.settings.language];
	} else if (this.dictionary[type] && this.dictionary[type][this.settings.defaultLanguage]) {
		tmp = this.dictionary[type][this.settings.defaultLanguage];
	}
	if (!tmp) {
		return type;
	}
	if (placeholders) {
		for (var i in placeholders) {
			tmp = tmp.replace('{'+ placeholders[i].key +'}', placeholders[i].value);
		}
	}
	return tmp;
};

Feedback.Messages.prototype.show = function(params) {
	var timeout;
	var that = this;
	var type = params.type || 'info';
	var message = this.get(params.message || '');
	var callback = params.callback;
	var isLoader = params.isLoader || false;
	var isGlobalFail = params.globalFail || false;

	var onClick = function() {
		if (timeout) {
			clearTimeout(timeout);
		}
		that.$message.addClass('hidden');
		if (typeof callback === 'function') {
			callback();
		}
	};
	if (!isLoader) {
		this.$message.on('click', onClick);
	}
	this.$message_text.html(message);
	this.$message.removeClass().addClass(type);

	if (!isLoader && !isGlobalFail) {
		timeout = setTimeout(onClick, this.settings.hideDelay);		
	}
};
Feedback.Messages.prototype.hide = function() {
	this.$message.addClass('hidden');
};

Feedback.TermsController = function(options){
	this.settings = {
		policy : {
			el : '#link_policy',
			container : '.feedback_policy.policy',
			endPoint :  '../../feedback/privacypolicy.php'
		},
		terms : {
			el : '#link_terms',
			container : '.feedback_policy.terms',
			endPoint : '../../feedback/termsofservice.php'
		},
		fanterms : {
			el : '#link_fan_terms',
			container : '.feedback_policy.fanterms',
			endPoint : '../../feedback/fanterms.php'
		},
		layout : 'body'
	};

	if (options.policyEndPoint) {
		this.settings.policy.endPoint = options.policyEndPoint;
	}
	if (options.termsEndPoint) {
		this.settings.terms.endPoint = options.termsEndPoint;
	}
	if (options.fantermsEndPoint) {
		this.settings.fanterms.endPoint = options.fantermsEndPoint;
	}

	this.$layout = $(this.settings.layout);

	this.$layout.on('click.close', '.link_close', this.pageHide.bind(this));
	this.$layout.on('click.policy', this.settings.policy.el, this.pageShow.bind(this));
	this.$layout.on('click.terms', this.settings.terms.el, this.pageShow.bind(this));
	this.$layout.on('click.fanterms', this.settings.fanterms.el, this.pageShow.bind(this));

};

Feedback.TermsController.prototype.pageShow = function(e) {
	e.preventDefault();
	var iid = $(e.currentTarget).attr('id');
	this.pageShowById(iid);
	return false;
};

Feedback.TermsController.prototype.pageShowById = function(iid) {
	var self = this;
	var settings;

	switch(iid) {
		case 'link_fan_terms':
			settings = this.settings.fanterms;
			break;
		case 'link_policy':
			settings = this.settings.policy;
			break;
		case 'link_terms':
			settings = this.settings.terms;
			break;
		default:
			settings = this.settings.terms;
			break;
	}

	$('.content', settings.container).load(settings.endPoint, function(){
		var $container = $(settings.container);
		var applicationTitle = $('meta[property="og:title"]').attr('content');
		$(self).trigger('applicationHide');
		$container.html( $container.html().replace(/{project}/gi, applicationTitle) ).fadeIn();
	});
	return false;
};

Feedback.TermsController.prototype.pageHide = function(e) {
	e.preventDefault();
	$('.feedback_policy').hide();
	$(this).trigger('applicationShow');
};
