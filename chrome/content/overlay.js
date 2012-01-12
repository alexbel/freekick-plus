var freekickplus = {
	enabled: true,
	freekickDomain: false,
	BEGINSEASON: new Date(2010, 2, 15),
	SEASONDURATIONDAYS: 98,
	lang: false,

	init: function() {
		freekickplus.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);

		if (freekickplus.prefs.getBoolPref("extensions.freekickplus.enabled")) {
			freekickplus.enable();
		} else {
			freekickplus.disable();
		}

		var appcontent = document.getElementById("appcontent");
		if (appcontent) {
			getBrowser().addProgressListener(progressListener);
		}
	},
	onPageLoad: function(event) {
		if (freekickplus.checkFreekickDomain() && freekickplus.enabled) {
			freekickplus.getLang();
			freekickplus.calcPlayersAge();
		}
	},
	checkFreekickDomain: function() {
		var domain = content.document.domain;
		if (domain === 'freekick.org' || domain === 'www.freekick.org') {
			return true;
		}
		return false;
	},
	getLang: function() {
		var classText = content.document.body.getAttribute('class');
		freekickplus.lang = classText.slice(0, 2);
	},
	enable: function() {
		freekickplus._changeStatusIconState(true);
		freekickplus._switchCheckedStatus(true);
		freekickplus.enabled = true;
		freekickplus.prefs.setBoolPref("extensions.freekickplus.enabled", true);
	},
	disable: function() {
		freekickplus._changeStatusIconState();
		freekickplus._switchCheckedStatus();
		freekickplus.enabled = false;
		freekickplus.prefs.setBoolPref("extensions.freekickplus.enabled", false);
	},
	showAboutDialog: function() {
		window.openDialog('chrome://freekickplus/content/about.xul', 'freekickplus-about-dialog', 'centerscreen,chrome,modal');
	},
	calcPlayersAge: function() {
		var nodes = freekickplus.getAgeNodes();

		// agesArray should be [{y: y, m: m, d: d, node: node}, ...]
		var agesArray = freekickplus.parsePlayerAge(nodes);

		var i = 0;
		for (i; i < agesArray.length; ++i) {
			freekickplus.setAge(agesArray[i]);
			freekickplus.setStyle(agesArray[i].node);
		}
	},
	getAgeNodes: function() {
		var nodes = [];

		if (content.document.location.search === '?loc=players') {
			nodes = freekickplus.getPlayerAgeNodes();
		} else {
			nodes.push(freekickplus.getPlayerAgeNode());
		}
		return nodes;
	},
	getPlayerAgeNodes: function() {
		// try to get age of all players
		var spans = content.document.getElementsByClassName('minimal algnR padded-right');
		if (spans && spans.length !== 0) {
			var editableNodes = [];
			var i = 0;
			for (i; i < spans.length; ++i) {
				var node = spans[i].getElementsByTagName('span')[0];
				if (node) {
					editableNodes.push(node);
				}

			}
			return editableNodes;
		}
	},
	getPlayerAgeNode: function() {
		// try to get one player
		var node = content.document.getElementsByClassName('plain-list alternate')[0];
		var li, span;
		if (node) {
			li = node.getElementsByTagName('li')[1];
			if (li) {
				span = li.getElementsByTagName('span')[0];
			}
		}
		return span;
	},
	setAge: function(age) {
		if (!age) {
			return false;
		}
		var today = freekickplus._getServerDate();
		var player = {};

		player.allRealDay = (age.y * 365) / 6 + (age.m * 30.42) / 6 + age.d / 6;
		player.birthDate = today.getTime() - player.allRealDay * 24 * 60 * 60 * 1000;
		player.day21 = player.birthDate + 21 * 365 * 24 * 60 * 60 * 1000 / 6;

		var day21 = player.birthDate + 21 * 365 * 24 * 60 * 60 * 1000 / 6;
		player.day21 = new Date(day21);

		var seasons = freekickplus._getSeasons();
		freekickplus.seasons = {
			cS: seasons[0],
			nS: seasons[1],
			nnS: seasons[2],
			nnnS: seasons[3],
			nnnnS: seasons[4]
		};

		day21 = player.day21;
		var s = freekickplus.seasons;
		var p = player;

		if (age.y >= 27) {
			p.seasonsPlayClass = 'age-old';
		}
		if (age.y < 27) {
			p.seasonsPlayClass = 'age-senior';
		}
		if (day21 < s.nS && day21 >= s.cS) {
			p.seasonsPlayClass = 'age-youth-0';
		}
		if (day21 >= s.nS && day21 < s.nnS) {
			p.seasonsPlayClass = 'age-youth-1';
		}
		if (day21 >= s.nnS && day21 < s.nnnS) {
			p.seasonsPlayClass = 'age-youth-2';
		}
		if (day21 >= s.nnnS && day21 < s.nnnnS) {
			p.seasonsPlayClass = 'age-youth-3';
		}
		if (day21 >= s.nnnnS) {
			p.seasonsPlayClass = 'age-youth-4';
		}
		p.tooltipMessage = freekickplus.getTooltipMessage(p.seasonsPlayClass);
		freekickplus.player = p;

	},
	getTooltipMessage: function(playClass) {
		playClass = playClass || 'en';
		return freekickplus._tooltipLang[freekickplus.lang][playClass];
	},
	setStyle: function(node) {
		node.setAttribute('class', freekickplus.player.seasonsPlayClass);

		var onmouseoverText = node.getAttribute('onmouseover');
		var re;

		if (content.document.location.search === '?loc=players') {
			re = /\<br\s\/\>\<br\s\/\>(.*)\.\'/gi;
		} else {
			re = /Tip\(\'(.+)\'\,/gi;
		}

		var result = re.exec(onmouseoverText);
		var newText = onmouseoverText.replace(result[1], freekickplus.player.tooltipMessage);
		node.setAttribute('onmouseover', newText);

	},
	parsePlayerAge: function(nodes) {
		if (!nodes || ! nodes[0]) {
			return false;
		}
		var ages = [];
		var i = 0;
		for (i; i < nodes.length; ++i) {
			ages.push(freekickplus._getAgeFromHTML(nodes[i]));
			//Application.console.log(ages[i].y +"y" + ages[i].m +"m"+ ages[i].d +"d");
		}
		return ages;
	},
	//
	// private functions
	//
	_getServerDate: function() {
		var rawHtml = content.document.getElementsByClassName('page-info-row')[0].innerHTML;
		var myRe = /(\d{4,4})-(\d{1,2})-(\d{1,2})/gi;
		var arr = myRe.exec(rawHtml);
		return new Date(arr[1], arr[2] - 1, arr[3]);
	},
	_getAgeFromHTML: function(node) {
		if (!node) {
			return false;
		}
		var text;
		var re = /([1-4][0-9])\s.\,\s(1?[0-9])\s.\,\s([0-9]+)\s/ig;

		if (content.document.location.search === '?loc=players') {
			text = node.getAttribute('onmouseover');
		} else {
			text = node.innerHTML;
		}
		var arr = re.exec(text);

		if (!arr[1]) {
			Application.console.log('Age was not found');
			return false;
		}

		return {
			y: parseInt(arr[1], 10),
			m: parseInt(arr[2], 10),
			d: parseInt(arr[3], 10),
			node: node
		};
	},
	_getSeasons: function() {
		var seasons = [];
		seasons.push(freekickplus._getCurrentSeason());
		var i = 0;
		for (i; i < 5; ++i) {
			seasons.push(freekickplus._getNextSeason(seasons[i]));
		}
		return seasons;
	},
	_getCurrentSeason: function(season) {
		var s = season || freekickplus.BEGINSEASON;
		var nextSeason = freekickplus._getNextSeason(s);
		var today = new Date();

		if (today.valueOf() >= s.valueOf() && today.valueOf() < nextSeason.valueOf()) {
			//g_season.push(s);
			return s;
		}
		return freekickplus._getCurrentSeason(nextSeason);
	},
	_getNextSeason: function(currentSeason) {
		if (!currentSeason) {
			return false;
		}
		var season = new Date(currentSeason.getFullYear(), currentSeason.getMonth(), currentSeason.getDate());
		return new Date(season.setDate(season.getDate() + freekickplus.SEASONDURATIONDAYS));
	},
	_tooltipLang: {
		ru: {
			'age-old': 'Стареющий игрок',
			'age-senior': 'Взрослый игрок',
			'age-youth-0': 'Последний сезон в молодежной команде',
			'age-youth-1': 'Сыграет за молодежную команду еще один сезон',
			'age-youth-2': 'Сыграет за молодежную команду еще 2 сезона',
			'age-youth-3': 'Сыграет за молодежную команду еще 3 сезона',
			'age-youth-4': 'Сыграет за молодежную команду еще 4 сезона'
		},
		en: {
			'age-old': 'Senior player',
			'age-senior': 'Senior player',
			'age-youth-0': 'Last season as youth player',
			'age-youth-1': 'Will be youth player for one more season',
			'age-youth-2': 'Will be youth player for two more seasons',
			'age-youth-3': 'Will be youth player for three more seasons',
			'age-youth-4': 'Will be youth player for four more seasons'
		},
		uk: {
			'age-old': 'Гравець основної команди',
			'age-senior': 'Гравець основної команди',
			'age-youth-0': 'Останній сезон у якості гравця молодіжної команди',
			'age-youth-1': 'Буде гравцем молодіжної команди ще протягом одного сезону',
			'age-youth-2': 'Буде гравцем молодіжної команди ще протягом 2 сезонів',
			'age-youth-3': 'Буде гравцем молодіжної команди ще протягом 3 сезонів',
			'age-youth-4': 'Буде гравцем молодіжної команди ще протягом 4 сезонів'
		}
	},
	_switchCheckedStatus: function(status) {
		var enable = document.getElementById('enable');
		var disable = document.getElementById('disable');
		if (status) {
			enable.setAttribute('checked', 'true');
		} else {
			disable.setAttribute('checked', 'true');
		}
	},
	_changeStatusIconState: function(status) {
		if (status) {
			document.getElementById('freekickplus-status-bar-icon').className = "statusbarpanel-iconic freekickStatusbarPanelEnable";
		} else {
			document.getElementById('freekickplus-status-bar-icon').className = "statusbarpanel-iconic freekickStatusbarPanelDisable";
		}
	}

};

var progressListener = {
	onLocationChange: function() {},
	onProgressChange: function() {},
	onSecurityChange: function() {},
	onStateChange: function() {
		freekickplus.onPageLoad();
	},
	onStatusChange: function() {},
	QueryInterface: XPCOMUtils.generateQI([Ci.nsIWebProgressListener, Ci.nsISupportsWeakReference])
};

window.addEventListener("load", function() {
	freekickplus.init();
},
false);

