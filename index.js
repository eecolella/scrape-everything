import request from 'request'
import cheerio from 'cheerio'
import colors from 'colors'
import path from 'path'
import _ from 'lodash'
import Promise from "bluebird"
const fs = Promise.promisifyAll(require('fs'))

function scrapeE(settings) {
	
	/*
	 * @scrapreE.settings(js)
	 * 
	 */
	settings = _.merge({
		verbose              : true,
		input                : 'input.json', // or array of urls
		output               : 'output.json', // or false
		urlBase              : '',
		mergeWithOldOutput   : true, // or false
		msDelayBeetweenChunks: 500, // or false
		maxConcurrentRequests: 2, // or false
		handleError          : url => {
			var urlSplited   = url.split('/'),
			    wordSearched = urlSplited[urlSplited.length - 1]
			
			return {
				url  : url,
				word : wordSearched,
				title: null
			}
		},
		traverseDom          : ($, url) => {
			var urlSplited   = url.split('/'),
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
	}, settings)
	
	settings.input = path.join(__dirname, settings.input)
	settings.output = path.join(__dirname, settings.output)
	
	let hookup = {};
	
	/*
	 *
	 *
	 *
	 *
	 * @scrapeE.return(js)
	 *
	 */
	return fs.readFileAsync(settings.input, 'utf-8')
	.then(JSON.parse)
	.then(urls => {
		if (settings.verbose)
			console.log('[ scrapeE ] No. url from input: %s'.blue, urls.length)
		return urls
	})
	// return urls without dubplicates
	.then(_.uniq)
	.then(urls => {
		if (settings.verbose)
			console.log('[ scrapeE ] No. unique url: %s'.blue, urls.length)
		return urls
	})
	.then(urls => urls.filter(url => url.split(/[\s\,\'\"\’]+/).length === 1))
	.then(urls => {
		if (settings.verbose)
			console.log('[ scrapeE ] No. unique one word url: %s'.blue, urls.length)
		return urls
	})
	.then(urls => urls.map(url => url.toLowerCase()))
	.then(urls => {
		hookup.urls = urls
		return urls
	})
	// read old output => return parsed data
	.then(() => {
		return fs.readFileAsync(settings.output, 'utf-8').then(JSON.parse)
	})
	// filter the url with the old one => return filtred urls
	.then(
		(dataOutput) => {
			hookup.dataOutput = dataOutput;
			
			return hookup.urls.filter(url => {
				if (settings.mergeWithOldOutput) return settings.falseIfExists(url, dataOutput, settings.verbose)
				return true
			})
		})
	// request urls => html
	.then((urlsFiltred) => {
		
		return Promise.map(urlsFiltred, url => new Promise((resolve, reject) => {
			
			setTimeout(() => {
				
				let urlFull = settings.urlBase + url
				
				if (settings.verbose)
					console.log('[ scrapeE ] Processing request to %s'.blue, urlFull)
				
				request(urlFull, true, (err, res, html) => {
						
						if (err) {
							console.log('[ scrapeE ] err %s: %s'.red, urlFull, err);
							return resolve({
								html: null,
								url : urlFull
							})
						}
						
						if (res.statusCode !== 200) {
							console.log('[ scrapeE ] %s res.statusCode: %s'.red, urlFull, res.statusCode);
							return resolve({
								html: null,
								url : urlFull
							})
						}
						
						return resolve({
							html: html,
							url : urlFull
						})
					}
				)
				
			}, settings.msDelayBeetweenChunks)
			
		}), { concurrency: settings.maxConcurrentRequests })
		
	})
	// traverse the dom => return the data
	.then((responses) => {
		
		hookup.dataInput = [];
		return responses.map(response => {
			let dataScrapped;
			if (response.html !== null) {
				let $ = cheerio.load(response.html);
				dataScrapped = settings.traverseDom($, response.url)
			} else {
				dataScrapped = settings.handleError(response.url)
			}
			
			hookup.dataInput.push(dataScrapped)
			return dataScrapped
		});
	})
	// save
	.then(() => {
		
		var dataMerged = settings.mergeWithOldOutput
			? hookup.dataOutput.concat(hookup.dataInput)
			: hookup.dataInput;
		
		return fs.writeFile(settings.output, JSON.stringify(dataMerged, null, 2), 'utf-8')
		
	})
	.then(() => console.log('[ scrapeE ] Data crawled saved in %s'.blue, settings.output))
	.catch(e => console.error("[ scrapeE ] ".red, e));
	
}

export default scrapeE;