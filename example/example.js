import scrapeE from '../index.js'

scrapeE({
	verbose              : true,
	input                : 'example/input.json', // or array of urls
	output               : 'example/output.json', // or false
	urlBase              : 'https://en.wikipedia.org/wiki/',
	mergeWithOldOutput   : true, // or false
	msDelayBeetweenChunks: 500, // or false
	maxConcurrentRequests: 2, // or false
	handleError          : url => {
		let urlSplited   = url.split('/'),
		    wordSearched = urlSplited[urlSplited.length - 1]
		
		return {
			url  : url,
			word : wordSearched,
			title: null
		}
	},
	traverseDom          : ($, url) => {
		let urlSplited   = url.split('/'),
		    wordSearched = urlSplited[urlSplited.length - 1]
		
		return {
			url  : url,
			word : wordSearched,
			title: $('h1').text()
		}
	},
	falseIfExists        : (word, list, verbose) => {
		
		if (list.length === 0) {
			return true
		}
		
		for (var i = 0, l = list.length; i < l; i++) {
			if (list[i].word === word) {
				if (verbose)
					console.log('[ scrapeE ] %s already exists, it will not be scrapped'.yellow, word);
				return false
			}
		}
		
		return true
	}
})