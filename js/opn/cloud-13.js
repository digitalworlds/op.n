/* V13
 * Author(s): Angelos Barmpoutis
 * 
 * Copyright (c) 2016, University of Florida Research Foundation, Inc. 
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain this copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce this
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution. 
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
 
/** 
 * This class handles the ID of objects in the cloud system. 
 * @param options A string or an object with the parts of the id.
 */
 (function(window){
	
	var CID_COOKIE='';
	var SID_COOKIE='';
	var UID_COOKIE='';
	var SERVER_KEY=null;
	var CLIENT_KEY=null;
	
	function renew_connection(){
		let p=new opn.Promise();
		CID_COOKIE='';
		let key = window.crypto.getRandomValues(new Uint8Array(16));
	
	crypto.subtle.importKey(
  		"raw",
  		key.buffer,
  		"AES-CTR",
  		false,
  		["encrypt", "decrypt"]
		).then((key_encoded)=>{
			CLIENT_KEY=key_encoded;
			
		let data={key:btoa(String.fromCharCode.apply(null, new Uint8Array(key)))};
		var cid=new URLSearchParams(window.location.search).get("CID");
		if(cid)data.CID=cid;
		
		commandJWT("connect",data).then((request)=>{
			
				var r=JSON.parse(request.responseText);
				if(r['.SUCCESS'])
				{
					CID_COOKIE=r['.DATA']['CID'];
					console.log("Connected: "+CID_COOKIE);
					
					 
					let info={};
					let canvas=document.createElement("canvas");
					let gl=canvas.getContext("experimental-webgl");
					if(gl!=null){
						let params={RENDERER:1,VENDOR:1,VERSION:1,MAX_COMBINED_TEXTURE_IMAGE_UNITS:1,MAX_TEXTURE_SIZE:1,MAX_VARYING_VECTORS:1,MAX_VERTEX_ATTRIBS:1,MAX_VERTEX_UNIFORM_VECTORS:1};
						
						for(let name in params){
							info[name]=gl.getParameter(gl[name]);
						}
						let dbgRenderInfo=gl.getExtension("WEBGL_debug_renderer_info");
						if(dbgRenderInfo!=null){
							info.RENDERER2=gl.getParameter(dbgRenderInfo.UNMASKED_RENDERER_WEBGL);
							info.VENDOR2=gl.getParameter(dbgRenderInfo.UNMASKED_VENDOR_WEBGL);
						}
					}
	
					info.platform=navigator.platform;
					info.userAgent=navigator.userAgent;
					info.url=location.href;
							
					if(performance&&performance.memory&&performance.memory.jsHeapSizeLimit){
						info.jsHeapSizeLimit=performance.memory.jsHeapSizeLimit;	
					}
						
					
					opn.cloud.command('clientinfo',info).then((request)=>{
						var r=JSON.parse(request.responseText);
						if(r['.SUCCESS'])
						{
							p.callThen();
						}
						else
						{
							p.callOtherwise();
						}
						
					}).otherwise(()=>{
						//network failed
						p.callOtherwise();
					})
					
					
				}
				else 
				{
					p.callOtherwise();
				}
			
		}).otherwise(()=>{
			//network failed
			p.callOtherwise();
		})
	})
		
		return p;
	}
	
	function decrypt(p1){
		let p=new opn.Promise();
		p1.then((request)=>{
			var data ;
			var iv;
			if(request.responseType=='arraybuffer'){
				var len=request.response.byteLength;
				iv=new Uint8Array(request.response,0,16);
	    		data=new Uint8Array(request.response,16,request.response.byteLength-16);
			}
			else{
				
				if(request.responseText.indexOf("{")==0){
					p.callOtherwise({object:request,event:request});
					return;
				}
				
				var b= window.atob(request.responseText);
	    		var len = b.length;
	    		iv=new Uint8Array(16);
	    		for (var i = 0; i < 16; i++) {
	        		iv[i] = b.charCodeAt(i);
	    		}
	    		len-=16;
	    		data=new Uint8Array(len);
	    		for (var i = 0; i < len; i++) {
	        		data[i] = b.charCodeAt(i+16);
	    		}
			}
			
				window.crypto.subtle.decrypt(
	  			{
	    			name: "AES-CTR",
	    			counter: iv,
	    			length: 128,
	  			},
	  		CLIENT_KEY,
	 		data
			).then((response)=>{
				if(request.responseType=='arraybuffer')
				p.callThen({object:{response},event:request})
				else
				p.callThen({object:{responseText:new TextDecoder().decode(response)},event:request})
			}).catch((e)=>{
				p.callOtherwise();
				throw(e);
			})
		}).otherwise(()=>{
			//network failed
			p.callOtherwise();
		})
		return p;
	}
	
	function encrypt(msg){
		const p=new opn.Promise();
		let data ;
		if(typeof msg === 'string') data=new TextEncoder().encode(msg);
		else data=msg;//Uint8Array
    	const iv=window.crypto.getRandomValues(new Uint8Array(16));
    	window.crypto.subtle.encrypt(
	  		{
	    		name: "AES-CTR",
	    		counter: iv,
	    		length: 128,
	  		},
	  	CLIENT_KEY,
	 	data
		).then((encrypted)=>{
			const enc=new Uint8Array(encrypted);
			const mergedArray = new Uint8Array(iv.length + enc.length);
			mergedArray.set(iv,0);
			mergedArray.set(enc, iv.length);
			if(typeof msg==='string')
			p.callThen({object:window.btoa(String.fromCharCode.apply(null, mergedArray)).replace(/\//g, '_').replace(/\+/g, '-')});
			else
			p.callThen({object:mergedArray});
		
		}).catch((e)=>{
			p.callOtherwise();
			throw(e);
		})
		
		return p;
	}
	
	function commandJWT(cmd,data){
		var p=new opn.Promise();
		
		let send=()=>{
		    const encodedText = new TextEncoder().encode(JSON.stringify({command:cmd,data:data,CID:CID_COOKIE}));
		        if(encodedText.length>190){
					console.log("Message too long (>190)");
					p.callCatch();
				}
		        else
		        window.crypto.subtle.encrypt({name: "RSA-OAEP"}, SERVER_KEY, encodedText).then((encrypted)=>{
		            const msg=window.btoa(String.fromCharCode.apply(null, new Uint8Array(encrypted))).replace(/\//g, '_').replace(/\+/g, '-');
		            opn.http(opn.hosturl+'do/',{method:'post',mime:"text/plain;charset=UTF-8",withCredentials:true,data:{j:msg}}).then((response)=>{
		                p.callThen({object:response});
		            }).otherwise((e)=>{p.callCatch({event:e});});
		        }).catch((e)=>{p.callCatch({event:e});throw(e);});
		};
		
		if(SERVER_KEY==null)
		opn.http(opn.hosturl+"do/jwks").then((response)=>{
		    jwks=JSON.parse(response.responseText);
		    let rsaPublicKey=jwks.keys[0];
		    rsaPublicKey.use="enc";
		    window.crypto.subtle.importKey("jwk", rsaPublicKey, {name: "RSA-OAEP", hash: {name: "SHA-256"}}, true, ["encrypt"]).then((key)=>{ 
		        SERVER_KEY=key;
		        send();
		    }).catch((e)=>{p.callCatch({event:e});throw(e);});
		}).otherwise((e)=>{p.callCatch({event:e})});
		else send();
		
		return p;
	}
	
	function parseCookies(){
		var ret=0;
		var i=document.cookie.indexOf(opn.hostname_+'_UID');
		if(i<0){
			UID_COOKIE='';
		}
		else{
			var s=document.cookie.substring(i);
			var i1=s.indexOf("=");
			var i2=s.indexOf(";");
			if(i2<0)i2=s.length;
			UID_COOKIE=s.substring(i1+1,i2);
			ret+=1;
		}
			
		var i=document.cookie.indexOf(opn.hostname_+'_SID');
		if(i<0){
			SID_COOKIE='';
		}
		else{
			var s=document.cookie.substring(i);
			var i1=s.indexOf("=");
			var i2=s.indexOf(";");
			if(i2<0)i2=s.length;
			SID_COOKIE=s.substring(i1+1,i2);
			ret+=2;
		}
		return ret;
	}
	
	function parseCookiesFallback(document_cookie){
		var i=document_cookie.indexOf('UID=');
		if(i<0){
			UID_COOKIE='';
		}
		else{
			var s=document_cookie.substring(i);
			var i1=s.indexOf("=");
			var i2=s.indexOf(";");
			if(i2<0)i2=s.length;
			UID_COOKIE=s.substring(i1+1,i2);
		}
			
		var i=document_cookie.indexOf('SID=');
		if(i<0){
			SID_COOKIE='';
		}
		else{
			var s=document_cookie.substring(i);
			var i1=s.indexOf("=");
			var i2=s.indexOf(";");
			if(i2<0)i2=s.length;
			SID_COOKIE=s.substring(i1+1,i2);
		}
	}
	
	parseCookies();
	
function opnCloudObjectID(options){
		
	this.version=0;
	this.oid='';
	this.hostname=null;
	//initialize from string
	if(typeof options==='string'){
		var dot=options.indexOf('.');
		var at=options.indexOf('@');
		
		var end_of_oid=Math.min(dot,at);
		if(end_of_oid<0)end_of_oid=options.length;
		this.oid=options.substring(0,end_of_oid);
		
		if(dot>=0){
			if(at>=0 && dot<at)
				this.version=parseInt(options.substring(dot+1,at));
			else if(at<0)this.version=parseInt(options.substring(dot+1,options.length));
		}
		
		if(at>=0){
			this.setHostname(options.substring(at+1,options.length));
		}
		
	}else if(options){
		if(options.oid)this.oid=options.oid;
		if(options.version)this.version=options.version;
		if(options.hostname){
			this.setHostname(options.hostname);
		}
	}
}


opnCloudObjectID.prototype.setHostname=function(hostname){
	if(hostname){
	this.hostname=hostname;
	
	var s=hostname;
	if(s.indexOf("https://")==0)s=s.substring(8);
	else if(s.indexOf("http://")==0)s=s.substring(7);
	if(s.charAt(s.length-1)=='/')s=s.substring(0,s.length-1);
	this.hostname=s;
	
	if(this.hostname==opn.hostname)this.hostname=null;
	if(this.hostname){
		s=this.hostname;
		s=s.replace("_","__");
		s=s.replace("/","_");
		this.hostname_=s;
	}
	}
	else hostname=null;
};

opnCloudObjectID.prototype.toString=function(use_){
	var s=this.oid;
	if(this.version)s+='.'+this.version;
	if(use_)
	{
		if(this.hostname_){
			s+='@'+this.hostname_;
		}
	}
	else{
		if(this.hostname){
			s+='@'+this.hostname;
		}
	}
	return s;
};

opnCloudObjectID.prototype.processIDfield=function(id){
	if(this.hostname!=null){
		var aid=new opnCloudObjectID(id);
		if(aid.hostname==null){
			aid.setHostname(this.hostname);
			return aid.toString();
		}else return id;
	}else return id;
};

/**
 * This method returns the URL of this cloud object in a static web server.
 * @param extension string An optional string to be appended at the end of the URL.
 * @return string A string with the URL of this cloud object.
 */
opnCloudObjectID.prototype.getStaticURL=function(extension){
	if(extension=="embed")extension="?"+extension;
	return opn.hosturl+'file/'+this.toString(true)+'/'+((typeof extension!=="undefined")?extension:"");
}

/**
 * This method returns the URL of this cloud object.
 * @param extension string An optional string to be appended at the end of the URL.
 * @return string A string with the URL of this cloud object.
 */
opnCloudObjectID.prototype.getURL=function(extension){
	return opn.hosturl+'file/'+this.toString(true)+'/'+((typeof extension!=="undefined")?extension:"");
}

/**
 * This method returns the URL of the icon of this cloud object.
 * @return string A string with the URL of the icon of this cloud object.
 */
opnCloudObjectID.prototype.getIconURL=function(){
	if(opn.static) return this.getStaticURL('icon.png');
	else return this.getURL('icon.png');
}

/**
 * This method returns the URL of the preview image  of this cloud object.
 * @return string A string with the URL of the preview image of this cloud object.
 */
opnCloudObjectID.prototype.getPreviewURL=function(){
	if(opn.static) return this.getStaticURL('preview.jpg');
	else return this.getURL('preview.jpg');
}


/** This class is the entry point to the op.n Cloud API. An object of this class is automatically created and can be accessed as opn.cloud . The VN Cloud API offers functionality to read and write files to the VN cloud storage. Each file has a section to define and retrieve metadata fields as well a file component that holds the data of a file (such as image, text, etc). Part of the functionality requires authentication using the login/logout methods provided in the opnCloudUser class.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * var me=opn.cloud.getMe();	<br>
 * <br>
 *	me.whenReady().then(function(){<br>
 *		console.log('already logged in');<br>
 *	}).otherwise(function(){<br>
 *		console.log('not logged in');<br>
 *  //here you can prompt login with me.login<br>
 *	});<br>
 *	<br>
 *	me.whenLogin().then(function(){<br>
 *		console.log('just logged in');<br>
 *	});<br>
 *	<br>
 *	me.whenLogout().then(function(){<br>
 *		console.log('just logged out');	<br>
 *	});<br>
 *	<br>
 *	me.whenAuthenticationRequired().then(function(){<br>
 *		console.log('authentication required');<br>
 *	});<br></font>
 */
function opnCloud(){
	
	this.connected_p=new opnPromise(this);
	
	this.encoder=new opnCloudEncoder();
	
	this._me=null;
	this._use=null;
	
	var self=this;
	this.setObjectForUse=function(o)
	{
		var p=new opnPromise(o);
		if(self._use)
			self._use.p.callOtherwise();
		if(o)self._use={p:p,object:p};else self._use=null;
		return p;
	};
	
	if(opn.static){
		this.getObject=this.getObjectStatic;
		this.download=this.downloadStatic;
		this.whenConnected().callThen();
		return;
	}
	
	renew_connection().then(()=>{
		this.whenConnected().callThen();
	}).otherwise(()=>{
		this.whenConnected().callOtherwise();
	})
	
}

opnCloud.prototype.whenConnected=function(){return this.connected_p;}

/**
 * This method returns the last cloud object placed on the clip board of the user using the object.pick() or null if there is no object in the clipboard. This allows the use of files accross applications within op.n 
 * @return opnCloudObject The last cloud object placed on the clipboard by the user or null.
 */
opnCloud.prototype.use=function()
{
	if(this._use)
	{
		this._use.p.callThen();
		return this._use.object;
	}
	else return null;
};

/**
 * This method returns the user object that contains the information and functionality of the current user.
 * @return opnCloudUser The user object that contains the information of this user.
 */
opnCloud.prototype.getMe=function()
{
	if(this._me)return this._me;
	
	var o=new opnCloudUser();
	this._me=o;
	o.reset();
	
	return o;
};

/**
 * This method returns the user object that contains the information and functionality of another user with a given ID.
 * @param id A string with the ID of the user.
 * @return opnCloudUser The user object that contains the information of this user.
 */
opnCloud.prototype.getUser=function(id)
{
	var o=new opnCloudUser(id);
	o.reset();
	return o;
};


opnCloud.prototype.command=function(cmd,data,d,files){
	let p=new opn.Promise();
	encrypt(JSON.stringify({command:cmd,data:data, SID:SID_COOKIE, UID:UID_COOKIE})).then((encrypted)=>{
	if(d)
		d(opn.http(opn.hosturl+'do/',{method:'post',mime:'text/plain;charset=UTF-8', withCredentials:true,data:{data:encrypted, CID:CID_COOKIE},files}))
		.then((object,event)=>{
			p.callThen({object,event})
		}).otherwise(()=>{
			p.callOtherwise();
		});
	else 
		decrypt(opn.http(opn.hosturl+'do/',{method:'post',mime:'text/plain;charset=UTF-8', withCredentials:true,data:{data:encrypted, CID:CID_COOKIE},files}))
		.then((object,event)=>{
			p.callThen({object,event})
		}).otherwise((request)=>{
			
			if(request&&request.responseText&&request.responseText.indexOf("{")==0){
				renew_connection().then(()=>{
					this.command(cmd,data,d,files).then((object,event)=>{
						p.callThen({object,event});
					}).otherwise(()=>{
						p.callOtherwise();
					})
				}).otherwise(()=>{
					p.callOtherwise();
				})
			}
			else p.callOtherwise();
		});

	}).otherwise(()=>{
		p.callOtherwise();
	})
	return p;
};

opnCloud.prototype.cookies=function(data){
	let p=new opnPromise();
	opn.cloud.command("receipt",data).then((request)=>{	
		var r=JSON.parse(request.responseText);
		  if(r[".DATA"]["UID"]){
					UID_COOKIE=r[".DATA"]["UID"];
				}
		  if(r[".DATA"]["SID"]){
					SID_COOKIE=r[".DATA"]["SID"];
				}
		p.callThen({object:request});
	}).otherwise(()=>{
		p.callOtherwise();
	})
	return p;
};

/**
 * This method downloads the data file of a particular cloud object.
 * @param oid The ID of the desired cloud object.
 * @param options An optional object with one or more of the following fields: version (a number with the requested version of the file; the last version will be assumed if not specified), type (a string with the desired format of data delivery such as "string","blob","url". The default format is Uint8Array.).
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloud.prototype.download=function(oid,options)
{
	var opt=options||{};
	var aborted=false;
	
	var p=new opnPromise();
	if(oid){}else{p.callCatch();return p;}
	var progress=p.getProgress();
	p.ifAborted(function(){
		aborted=true;
	});	
	
	progress.whenOneMoreToDo().then((n)=>{
		opn.getProgress().oneMoreToDo(n);
		if(opt.progress)opt.progress.oneMoreToDo(n);
	});
	progress.whenOneMoreDone().then((n)=>{
		opn.getProgress().oneMoreDone(n);
		if(opt.progress)opt.progress.oneMoreDone(n);
	});	
	
	
	var id=new opnCloudObjectID(oid);
	if(opt.version)id.version = opt.version;
	
	var downloaded=0;
	var must_download=0;
	var chunk_size=0;
	var total_size=0;
	var merged=null;
	var t0=new Date().getTime();
	var dt1=0;var dt1c=0;
	var dt2=0;var dt2c=0;
	
	//The last part is downloaded second and it starts downloading the intermediate parts if any (>2).
	var download_last_part=(first_part)=>{
		
		progress.oneMoreToDo(must_download-1);
		decrypt(opn.http(opn.hosturl+'file/'+id.toString(true)+'/data'+(must_download-1)+'?client='+location.hostname,{method:'post',responseType:'arraybuffer',withCredentials:true,data:{CID:CID_COOKIE}})).then(function(decrypted_request,request){
			
			var e=opn.cloud.encoder;
			e.decode(decrypted_request.response).then((b)=>{
				progress.oneMoreDone();
				downloaded+=1;
				total_size=chunk_size*(must_download-1)+b.length;
				merged=new Uint8Array(total_size);
				merged.set(first_part);
				merged.set(b, chunk_size*(must_download-1));
				if(must_download>2){
					download_next_part(1);
					download_next_part(2);
					download_next_part(3);
					download_next_part(4);
				}
				else {
					progress.oneMoreDone();
					p.callThen({object:e.format(merged,opt),event:request});
				}
				
			}).otherwise((e)=>{
				p.callCatch({object:request.response,event:e});
			});
		
		}).otherwise((request)=>{p.callCatch({event:request});});
		
	}
	
	var download_next_part=(part_id)=>{	
		if(aborted)return;
		
		if(part_id<must_download-1){
			var t1=new Date().getTime();
			decrypt(opn.http(opn.hosturl+'file/'+id.toString(true)+'/data'+part_id+'?client='+location.hostname,{method:'post',responseType:'arraybuffer',withCredentials:true,data:{CID:CID_COOKIE}})).then(function(decrypted_request,request){
				dt1=(dt1*dt1c+(new Date().getTime()-t1))/(dt1c+1);
				dt1c+=1;
				
					var e=opn.cloud.encoder;
					var t2=new Date().getTime();
					e.decode(decrypted_request.response).then((b)=>{
						dt2=(dt2*dt2c+(new Date().getTime()-t2))/(dt2c+1);
						dt2c+=1;
						
						progress.oneMoreDone();
						downloaded+=1;
						merged.set(b,chunk_size*part_id);
						if(downloaded==must_download){			
							console.log("Downloaded "+(total_size/(new Date().getTime()-t0))+" kB/s "+dt1+" "+dt2);
							progress.oneMoreDone();
							p.callThen({object:e.format(merged,opt),event:request});							
						}
						else download_next_part(part_id+4);
						
					}).otherwise((e)=>{
						p.callCatch({object:request.response,event:e});
					});
				
			}).otherwise((request)=>{p.callCatch({event:request});});
			
		}
	}
	
	progress.oneMoreToDo(2);
	
	//This downloads the first part.
	decrypt(opn.http(opn.hosturl+'file/'+id.toString(true)+'/data'+'?client='+location.hostname,{method:'post',responseType:'arraybuffer',withCredentials:true,data:{CID:CID_COOKIE}})).then(function(decrypted_request,request){
		progress.oneMoreDone();
		var cl=request.getResponseHeader('Content-Language');
		if(cl && (cl.indexOf('ds1_')==0 || cl=='deflate_shift1'))//cl may be null if Content-Language is not defined.
		{
			var e=opn.cloud.encoder;
			e.decode(decrypted_request.response).then((b)=>{
				if(cl=='deflate_shift1') must_download=1;
				else must_download=parseInt(cl.substring(4));
				chunk_size=b.length;
				downloaded=1;
				if(must_download>1)
					download_last_part(b);
				else {
					progress.oneMoreDone();
					p.callThen({object:e.format(b,opt),event:request});
				}
			}).catch((e)=>{
				progress.oneMoreDone();
				p.callCatch({object:decrypted_request.response,event:request});
			});
		}
		else 
		{
			var e=opn.cloud.encoder;
			progress.oneMoreDone();
			p.callThen({object:e.format(decrypted_request.response,opt),event:request});
		}
	}).otherwise((request)=>{progress.oneMoreDone(2);p.callCatch({event:request});});
	
	return p;
};

opnCloud.prototype.downloadStatic=function(oid,options)
{
	var opt=options||{};
	var p=new opnPromise();
	if(oid){}else{p.callCatch();return p;}

	var progress=p.getProgress();
	p.ifAborted(function(){
		aborted=true;
	});	
	
	progress.whenOneMoreToDo().then(function(n){
		opn.getProgress().oneMoreToDo(n);
		if(opt.progress)opt.progress.oneMoreToDo(n);
	});
	progress.whenOneMoreDone().then(function(n){
		opn.getProgress().oneMoreDone(n);
		if(opt.progress)opt.progress.oneMoreDone(n);
	});	

	var id=new opnCloudObjectID(oid);
	if(opt.version)id.version = opt.version;
	
	var parts=0;
	var next_part=0;
	var chunk_size=0;
	var last_part=null;
	var merged=null;
	var total_size=0;
	
	
	
	var download_next=()=>{
		if(next_part>=0){
			opn.http(id.getStaticURL('part'+next_part),{responseType:'arraybuffer'}).then(function(request){
				var e=opn.cloud.encoder;
				e.decode(request.response).then(function(b){
					if(next_part==parts-1){
						last_part=b;
					}
					else if(next_part==parts-2){
						chunk_size=b.length;
					}else{
						merged.set(b, chunk_size*next_part);
					}
					
					if(parts==1 || next_part==parts-2){
						total_size=chunk_size*(parts-1)+last_part.length;
						merged=new Uint8Array(total_size);
						merged.set(last_part, chunk_size*(parts-1));
						if(next_part==parts-2)
							merged.set(b, chunk_size*(parts-2));
					}
					next_part-=1;
					progress.oneMoreDone();
					download_next();
				}).catch(function(e){
					progress.oneMoreDone();
					p.callCatch({object:request.response,event:e});
				});
			}).otherwise(function(request){p.callCatch({event:request});});
		}else{
			var e=opn.cloud.encoder;
			progress.oneMoreDone();
			p.callThen({object:e.format(merged,opt)});
		}
	}
	
	progress.oneMoreToDo();
	opn.http(id.getStaticURL('parts'),{responseType:'text'}).then(function(request){
		parts=parseInt(request.response);
		progress.oneMoreToDo(parts);
		next_part=parts-1;
		download_next();	
	}).otherwise(function(request){p.callCatch({event:request});});;
	
	return p;
};

opnCloud.progress=function(arr,orig){
	
	var stflds=function(rr,key,update){
		var current=rr[key];
			
		if(typeof update === "string"){
			if(update==="")//remove
			{
				if(typeof current!=="undefined"){
					delete rr[key];
					return "";
				}
				else return null; //nothing to remove
			}
			else if(typeof current === "string"){
				if(update!=current){
					rr[key]=update;
					return update;
				}
				else return null;//same value
			}else{//overwrite current field, which is not a string
				rr[key]=update;
				return update;
			}
		}
		else if(typeof update==="boolean"){
			if(typeof current==="boolean"){
				if(update!=current){
					rr[key]=update;
					return update;
				}
				else return null;//same value
			}else{//overwrite current field, which is not a boolean
				rr[key]=update;
				return update;
			}
		}
		else if(typeof update==="number"){
			if(typeof current==="number"){
				if(update!=current){
					rr[key]=update;
					return update;
				}
				else return null;//same value
			}else{//overwrite current field, which is not a boolean
				rr[key]=update;
				return update;
			}
		}
		else if(Array.isArray(update)){
			return null;
		}
		else if(typeof update === "object"){
			if(typeof current === "object"){
				var i=0;
				var diff={};
				for(var k in update){
					var obj=stflds(current,k,update[k]);
					if(obj!=null){
						diff[k]=obj;
						i+=1;
					}
				}
				if(i==0) return null;
				else return diff;
			}else{//overwrite current field, which is not an object
				var i=0;
				var diff={};
				var c={};
				for(var k in update){
					var obj=stflds(c,k,update[k]);
					if(obj!=null){
						diff[k]=obj;
						i+=1;
					}
				}
				if(i==0) return null;
				else {
					rr[key]=c;
					return diff;
				}
			}
			
		}
		else return null;
	}
	
	//TODO: this must be removed in released version
	var oldcmp=function(rr){
		if(typeof rr === "object"){
			
			var list=[];
			for(var key in rr){
				if(key.indexOf('.')==0)list.push(key);
				oldcmp(rr[key]);
			}
			for(var i=0;i<list.length;i++){
				var key=list[i];
				var v=rr[key];
				delete rr[key];
				rr["VN_"+key.substring(1)]=v;
			}
		}
		else return;
	}
	
	var i=1;
	var rr=arr[0];
	if(orig){rr=orig;i=0;}
	if(typeof rr[".DATE_MODIFIED"]==='undefined')rr[".DATE_MODIFIED"]=rr[".DATE_CREATED"];
	
	for(;i<arr.length;i++){
		var update=arr[i];
			
		for(var key in update){
			var value=update[key];
			stflds(rr,key,value);
		}
		rr[".VERSION"]+=1;
		if(update[".T"]){
			rr[".DATE_MODIFIED"]+=rr[".T"];
		}
	}
	
	
	if(rr[".T"]){
		delete rr[".T"];
	}
	//oldcmp(rr);
	//console.log(rr);
	return rr;
}

/**
 * This method loads a cloud object with a given ID.
 * @param string A string with the ID of the object to be loaded. 
 * @return opnCloudObject The cloud object associated with the result of this request.
 */
opnCloud.prototype.getObject=function(oid,options)
{
	var o=new opnCloudObject();
	var opt=options||{};
	opn.cloud.command('info',{OID:oid}).then((request)=>{
		var r=JSON.parse("{\"data\":["+request.responseText+"]}");
		
		if(opt.history===true)
		{
			let h=[];
			let d=[];
			let current=r.data[0];
			h.push(JSON.parse(JSON.stringify(current)));
			for(let i=1;i<r.data.length;i++){
				current=opnCloud.progress([current,r.data[i]]);
				d.push(r.data[i]);
				h.push(JSON.parse(JSON.stringify(current)));
			}
			r=h[h.length-1];
			o.history=[];
			o.diff=[];
			for(let i=0;i<h.length;i++)
			{
				o.history.push(h[h.length-1-i]);
				if(i>0)o.diff.push(d[d.length-i]);
			}
		}
		else r=opnCloud.progress(r.data);
		
		
		
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
		else 
		{
			o.info=r;
			o.id=new opnCloudObjectID(oid);
			
			
			var hst=o.id.hostname;
			/*if(typeof o.info.VN_EVOLVED_VERSION!=='undefined' && o.info.VN_EVOLVED_VERSION==o.info.VN_VERSION){
				var aid=new opnCloudObjectID(o.info.VN_CLONED_FROM_OID);
				hst=aid.hostname;
			}*/
			
			if(hst!=null)
			{
				if(o.getSystemProperty('LIST')){
					var a=o.getSystemProperty('LIST');
					var a2={};
					for(var i in a){
						var aid=new opnCloudObjectID(i);
						if(aid.hostname==null){
							aid.setHostname(hst);
							a2[aid.toString()]=a[i];
						}
					}
					o.setSystemProperty('LIST',a2);
				}
				
				var properties={'OPEN':1,'ICON':1,'PREVIEW':1};
				for(var prop in properties){
					var v=o.getSystemProperty(prop);
					if(typeof v!=='undefined'){
						o.setSystemProperty(prop,o.processIDfield(v));
					}
				}
				
			}
			
			o.whenReady().callThen();
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
	return o;
};

opnCloud.prototype.getObjectStatic=function(oid)
{
	var o=new opnCloudObject();
	var id=new opnCloudObjectID(oid);
	opn.http(id.getStaticURL('info.json')).then(function(request){
		var r=JSON.parse("{\"data\":["+request.responseText+"]}");
		r=opnCloud.progress(r.data);
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
		else 
		{
			o.info=r;
			o.id=new opnCloudObjectID(oid);
			o.whenReady().callThen();
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
	return o;
};
 
opnCloud.prototype.publish=function(oid)
{
	var p=new opnPromise(this);
	opn.cloud.command('publish',{OID:oid}).then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
			{
				var ar=opn.cloud.getMe().whenAuthenticationRequired();
				ar.callThen();
				ar.reset();
			}
			p.setObject(r);
			p.callCatch();
		}
		else 
		{
			p.callThen({object:r});
		}
	}).catch(function(request){		
		p.callCatch();
	});
	return p;
};
 
opnCloud.prototype.getHistory=function(oid)
{
	var p=new opnPromise(this);
	opn.cloud.command('history',{OID:oid}).then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
			{
				var ar=opn.cloud.getMe().whenAuthenticationRequired();
				ar.callThen();
				ar.reset();
			}
			p.setObject(r);
			p.callCatch();
		}
		else 
		{
			p.callThen({object:r});
		}
	}).catch(function(request){		
		p.callCatch();
	});
	return p;
};

opnCloud.prototype.getClones=function(oid)
{
	var p=new opnPromise(this);
	opn.cloud.command('clones',{OID:oid}).then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
			{
				var ar=opn.cloud.getMe().whenAuthenticationRequired();
				ar.callThen();
				ar.reset();
			}
			p.setObject(r);
			p.callCatch();
		}
		else 
		{
			p.callThen({object:r});
		}
	}).catch(function(request){		
		p.callCatch();
	});
	return p;
};

/** This class handles the reading and writing of a file object in the op.n cloud. Objects of this class are generated by opn.cloud.getObject or other methods such as opn.cloud.getMe().newObject. A file in the VN cloud has a list of metadata fields that can be edited using this class, and possibly a data file (such as a binary or a text file). In addition a file may contain other files and thus behave as a folder.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * var file=opn.cloud.getObject('the id of an object');<br>
 * file.whenReady().then(function(){<br>
 * ...<br>
 * }).otherwise(function(event){<br>
 * ...<br>
 * });<br></font>
 */
function opnCloudObject()
{
	this._reset();
}

opnCloudObject.prototype._reset=function()
{
	this.ready_promise=new opnPromise(this);
	delete this.info;
};

opnCloudObject.prototype.whenChanged=function(){
	if(this._change_p)return this._change_p;
	this._change_p=new opnPromise(this);
	return this._change_p;
};

/**
 * This method returns a promise that is triggered when a textual description of this object have been loaded and is ready to be used.
 * @return opnPromise A promise object that is triggered when the description is loaded. The description is provided as a string to the call of the "then" method of this promise. 
 */
opnCloudObject.prototype.getDescription=function()
{
	var self=this;
	var p=new opnPromise(this);
	this.whenReady().then(
	function(){
	opn.http(opn.hosturl+'file/'+self.getId(true)+'/description').then(function(request){
		p.setObject(request.responseText);
		p.callThen();
	}).catch(function(){
		p.callCatch();
	});
	});
	return p;
};

/**
 * This method copies a reference of this object to the user's cloud clipboard so that the user can use it in other parts of your application using the method opn.cloud.use().
 * This allows the use of files accross applications within op.n
 */
opnCloudObject.prototype.pick=function()
{
	return opn.cloud.setObjectForUse(this);
};

/**
 * This method returns the URL of this cloud object.
 * @param extension string An optional string to be appended at the end of the URL.
 * @return string A string with the URL of this cloud object.
 */
opnCloudObject.prototype.getURL=function(extension){
	if(opn.static) return this.id.getStaticURL(extension);
	return this.id.getURL(extension);
}

/**
 * This method returns the URL of the icon of this cloud object.
 * @return string A string with the URL of the icon of this cloud object.
 */
opnCloudObject.prototype.getIconURL=function(){
	return this.id.getIconURL();
}

/**
 * This method returns the URL of the preview image  of this cloud object.
 * @return string A string with the URL of the preview image of this cloud object.
 */
opnCloudObject.prototype.getPreviewURL=function(){
	return this.id.getPreviewURL();
}

/**
 * This method returns a promise that is triggered when the metadata of the object have been loaded and is ready to be used.
 * @return opnPromise A promise object that is triggered when the object has been loaded and is ready to be used. 
 */
opnCloudObject.prototype.whenReady=function(){return this.ready_promise;};

/**
 * This method returns the id of this cloud object as a string.
 * @param use_ Boolean to indicate if you want the "/" characters to be replaced by "_" to be used in URLs
 * @return string A string with the id of this object. 
 */
opnCloudObject.prototype.getId=function(use_){if(this.id)return this.id.toString(use_);else new Error('No id');};

/**
 * This method returns the id of this cloud object as a string followed by "@" and the op,n host name
 * @return string A string with the long id of this object.
 */
opnCloudObject.prototype.getLongId=function(){var i=this.getId();if(i.indexOf('@')>-1)return i;else return i+'@'+opn.hostname;};

opnCloudObject.prototype.processIDfield=function(id){
	return this.id.processIDfield(id);
};

opnCloudObject.prototype.getIDfield=function(field){
	if(this.info && this.info[field]){
		return this.id.processIDfield(this.info[field]);
	}
	console.log('ERROR: Unknown field '+field);
};

opnCloudObject.prototype.applyDiff=function(diff){
	if(typeof this.info==='undefined')
		this.info={};
	opn.set(this.info,diff);
	for(v in diff)
		if(diff[v]==='') delete this.info[v];
};

/**
 * This method updates the metadata fields of this object. The fields to be updated should be given as an input object. If you want to delete a field of the file you can set it's value to a string of zero length.
 * Example: file.setFields({name:'Angelos', lastname: 'Barmpoutis', score: '50', deprecated_field:''});
 * @param data An object with the fields to be updated.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.setFields=function(data){
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('setfield',{OID:this.getId(),DIFF:JSON.stringify(data)},p);
	});
	return p;
};

/**
 *This method returns the metadata fields of this object. Make sure that the file has been loaded (using whenReady) before calling this method.
 *@return object An object with the metadata of this file.
 */
opnCloudObject.prototype.getFields=function(){return this.info;};

/**
 * This method updates the name (metadata field .NAME) of this file.
 * @param name A string with the new name of this file.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.rename=function(name){
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('rename',{OID:this.getId(),NAME:name},p);
	});
	return p;
};

/**
 * This method archives a file.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.archive=function()
{
	var self=this;
	var p=new opnPromise(this);
	this.whenReady().then(
	function(){
		opn.cloud.command('archive',{OID:self.getId()}).then(function(request){

				var r=JSON.parse(request.responseText);
				if(r['.SUCCESS'])
				{
					self._reset();
					p.callThen();
					self.whenChanged().callThen();
				}
				else 
				{
					if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
					p.setObject(r);
					p.callCatch();
				}

			}).catch(function(request){
				
				p.callCatch();
			});
	});return p;
};

/**
 * This method creates a new cloud object as a clone of this object.
 * @return opnCloudObject The cloud object that was created after this request.
 */
opnCloudObject.prototype.clone=function()
{
	var o=new opnCloudObject();
	var self=this;
	this.whenReady().then(
	function(){
		opn.cloud.command('clone',{OID:self.getId()}).then(function(request){
			var r=JSON.parse(request.responseText);
			if(r['.SUCCESS'])
			{	
				r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],o.info);
				o.applyDiff(r['.DATA']['.DIFF']);
				o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
				o.whenReady().callThen();
				self.whenChanged().callThen();
			}
			else 
			{
				if(r['.COMMENTS']=='Authentication required.')
				{
					var ar=opn.cloud.getMe().whenAuthenticationRequired();
					ar.callThen();
					ar.reset();
				}
				o.whenReady().setObject(r);
				o.whenReady().callCatch();
			}
		}).catch(function(request){		
			o.whenReady().callCatch();
		});
	});
	return o;
};

/**
 * This method evolves this object as a clone of another object.
 * @param object The opnCloudObject to be cloned.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.evolve=function(object)
{
	var self=this;
	var p=new opnPromise(this);
	this.whenReady().then(
	function(){
	object.whenReady().then(
	function(){
		opn.cloud.command('evolve',{OID:self.getId(),OID2:object.getId()}).then(function(request){
			var r=JSON.parse(request.responseText);
			if(r['.SUCCESS'])
			{
				r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],self.info);
				self.applyDiff(r['.DATA']['.DIFF']);
				p.callThen();
				self.whenChanged().callThen();
			}
			else 
			{
				if(r['.COMMENTS']=='Authentication required.')
				{
					var ar=opn.cloud.getMe().whenAuthenticationRequired();
					ar.callThen();
					ar.reset();
				}
				p.setObject(r);
				p.callCatch();
			}
		}).catch(function(request){
			p.callCatch();
		});
	});});return p;
};

/**
 * This method evolves this object as a clone of another object.
 * @param id A string with the id of the object to be cloned.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.evolveById=function(id)
{
	var self=this;
	var p=new opnPromise(this);
	this.whenReady().then(
	function(){
		opn.cloud.command('evolve',{OID:self.getId(),OID2:id}).then(function(request){
			var r=JSON.parse(request.responseText);
			if(r['.SUCCESS'])
			{
				r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],self.info);
				self.applyDiff(r['.DATA']['.DIFF']);
				p.callThen();
				self.whenChanged().callThen();
			}
			else 
			{
				if(r['.COMMENTS']=='Authentication required.')
				{
					var ar=opn.cloud.getMe().whenAuthenticationRequired();
					ar.callThen();
					ar.reset();
				}
				p.setObject(r);
				p.callCatch();
			}
		}).catch(function(request){
			p.callCatch();
		});
	});return p;
};

opnCloudObject.prototype.getHistory=function()
{
	return opn.cloud.getHistory(this.getId());
};

opnCloudObject.prototype.getFeed=function(postid)
{
	return opn.cloud.getFeed(this.getId(),postid);
};

opnCloudObject.prototype.getClones=function()
{
	return opn.cloud.getClones(this.getId());
};

/**
 * This method uploads a data file to this cloud object.
 * @param options An object with one or more of the following fields: file (a JavaScript File object to be uploaded, or a string with the contents of a text to be uploaded), mime (a string with the MIME of the uploaded file), progress (a opnProgress object to be updated with the progress of this request).
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.upload=function(options)
{
	var opt=options||{};
	var file=opt.file;
	var mime=opt.mime;
	var filename=''; if(opt.filename)filename=opt.filename;
	var lastmodified=null;
	var originalfilesize=null;
	var self=this;
	var p=new opnPromise(this);
	var progress=p.getProgress();
	var aborted=false;
	p.ifAborted(function(){
		aborted=true;
	});	
	
	progress.whenOneMoreToDo().then(function(n){
		opn.getProgress().oneMoreToDo(n);
		if(opt.progress)opt.progress.oneMoreToDo(n);
	});
	progress.whenOneMoreDone().then(function(n){
		opn.getProgress().oneMoreDone(n);
		if(opt.progress)opt.progress.oneMoreDone(n);
	});	
	
	var chunk_size=100000;	
	var FILE_ENCODING='none';
	
	var upload=function(buffer)
	{
		var sent=0;
		var chunks_uploaded=0;
		var t0=new Date().getTime();
		var sz=buffer.byteLength;
		var total_chunks=Math.ceil(sz/chunk_size);
		progress.oneMoreToDo(total_chunks);
		
		function finish_uploading()
		{
			
				var d={method:'post',withCredentials:true,data:{OID:self.getId()}};
				if(opt.mime)d.data.MIME=opt.mime;
				if(filename.length>0)d.data.FILE_NAME=filename;
				if(lastmodified)d.data.FILE_MODIFIED=lastmodified;
				d.data.FILE_ENCODING=FILE_ENCODING;
				if(originalfilesize)d.data.ORIGINAL_FILE_SIZE=originalfilesize;
				opn.cloud.command("mergeparts",d.data).
				then(function(request){
					var r=JSON.parse(request.responseText);
					if(r['.SUCCESS'])
					{
						r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],self.info);
						self.applyDiff(r['.DATA']['.DIFF']);
						progress.oneMoreDone();
						p.callThen();
						self.whenChanged().callThen();
					}
					else 
					{
						if(r['.COMMENTS']=='Authentication required.')
						{
							var ar=opn.cloud.getMe().whenAuthenticationRequired();
							ar.callThen();
							ar.reset();
						}
						p.setObject(r);
						if(!p.catchCalled)p.callCatch();
						return;
					}
				}).catch(function(){if(!p.catchCalled)p.callCatch();});
		}
		
		function upload_chunk(chunk_id){
			if(aborted)return;
			
			if(chunk_id>=total_chunks)return;
			
				var e=opn.cloud.encoder;
				var a=buffer.slice(chunk_id*chunk_size,Math.min(chunk_id*chunk_size+chunk_size,buffer.byteLength));
				e.encode(a).then(function(b){encrypt(new Uint8Array(b)).then((b2)=>{
					
				var chunk_file={filename:filename,data:b2};
				var files={};files['part'+chunk_id]=chunk_file;
				
					opn.cloud.command("uploadfilepart",{OID:self.getId()},null,files).
					then(function(request){
						progress.oneMoreDone();
							
						var r=JSON.parse(request.responseText);
						if(r['.SUCCESS']){}
						else
						{
							if(r['.COMMENTS']=='Authentication required.')
							{
								var ar=opn.cloud.getMe().whenAuthenticationRequired();
								ar.callThen();
								ar.reset();
							}
							p.setObject(r);
							if(!p.catchCalled)p.callCatch();
							return;
						}
						chunks_uploaded+=1;
						sent+=chunk_file.data.length;
						
						if(chunks_uploaded==total_chunks){
							console.log("Compression: "+(sent/originalfilesize)+" ("+(sent/(new Date().getTime()-t0))+" kB/s)");
							finish_uploading();
						}
						else upload_chunk(chunk_id+4);
						
						//var t=Math.round((new Date().getTime()-t0)/1000);
						//var rem=Math.floor(Math.max(0,t*(sz-sent)/sent));
						
						//if(rem>=60) c.println(Math.ceil(rem/60)+' min. remaining.');
						//else if(rem>5) c.println(rem+' sec. remaining.');
						//else c.println('Almost done.');
						
						
					}).
					catch(function(request){
						if(!p.catchCalled)p.callCatch();
					});
				   });
				});
		}//end of upload_chunk() 
		upload_chunk(0);
		upload_chunk(1);
		upload_chunk(2);
		upload_chunk(3);
	};
	
	var do_upload=function(buffer)
	{
		originalfilesize=buffer.byteLength;
		
		FILE_ENCODING='ds1_'+Math.ceil(originalfilesize/chunk_size); 
		upload(buffer);
	};
	
	var init_upload=function()
	{
	
		
		if(file instanceof File)
		{
			var reader = new FileReader();
			reader.onload = function(event) {
				if ('name' in file)filename=file.name;
				if('lastModified' in file) lastmodified=file.lastModified;		
				do_upload(event.target.result);
			}
			reader.readAsArrayBuffer(file);
		}
		else if(file instanceof ArrayBuffer)
		{
			do_upload(file);
		}
		else if(file instanceof Uint8Array)
		{
			/*var buffer = new ArrayBuffer(file);
			var bufView = new Uint8Array(buffer);
			for (var i=0, strLen=file.length; i<strLen; i++) {
				bufView[i] = file[i];
			}*/
			do_upload(file.buffer.slice(file.byteOffset, file.byteLength + file.byteOffset));
		}
		else if(typeof file === 'string')
		{
			
			function toUTF8Array(str) {
				var utf8 = [];
				for (var i=0; i < str.length; i++) {
					var charcode = str.charCodeAt(i);
					if (charcode < 0x80) utf8.push(charcode);
					else if (charcode < 0x800) {
						utf8.push(0xc0 | (charcode >> 6), 
								  0x80 | (charcode & 0x3f));
					}
					else if (charcode < 0xd800 || charcode >= 0xe000) {
						utf8.push(0xe0 | (charcode >> 12), 
								  0x80 | ((charcode>>6) & 0x3f), 
								  0x80 | (charcode & 0x3f));
					}
					// surrogate pair
					else {
						i++;
						// UTF-16 encodes 0x10000-0x10FFFF by
						// subtracting 0x10000 and splitting the
						// 20 bits of 0x0-0xFFFFF into two halves
						charcode = 0x10000 + (((charcode & 0x3ff)<<10)
								  | (str.charCodeAt(i) & 0x3ff));
						utf8.push(0xf0 | (charcode >>18), 
								  0x80 | ((charcode>>12) & 0x3f), 
								  0x80 | ((charcode>>6) & 0x3f), 
								  0x80 | (charcode & 0x3f));
					}
				}
				return utf8;
			}
			if (!Int8Array.__proto__.from){
				var utf8=toUTF8Array(file);
				var buffer = new ArrayBuffer(utf8.length);
				var bufView = new Uint8Array(buffer);
				for (var i=0, strLen=utf8.length; i<strLen; i++) {
					bufView[i] = utf8[i];
				}
				do_ulpoad(buffer);
			}
			else{
				var utf8=Uint8Array.from(toUTF8Array(file));
				do_upload(utf8.buffer.slice(utf8.byteOffset, utf8.byteLength + utf8.byteOffset));
			}
		}
	};
	
	this.whenReady().then(function(){
		progress.oneMoreToDo();
		init_upload();
	
	});
	return p;
};

opnCloudObject.prototype.uploadImage=function(options)
{
	//console.log('uploadImage called '+ new Date().getTime());
	
	var opt=options||{};
	var file=opt.file;
	var self=this;
	var p=new opnPromise(this);
	
	var pr=new opnProgress();
	pr.oneMoreToDo(3);
	pr.whenDone().then(function(pr){
		
		//console.log('promise entered '+ new Date().getTime());
		
		var data={OID:self.getId(),IMAGE_WIDTH:pr.width,IMAGE_HEIGHT:pr.height};
		
		
		opn.cloud.command('uploadimage',data,null,[{'filename':'icon','data':pr.icon},{'filename':'preview','data':pr.preview}]).then(function(request){
			
			//console.log('upload will start '+ new Date().getTime());
			var r=JSON.parse(request.responseText);
			if(r['.SUCCESS'])
			{
				r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],self.info);
				self.applyDiff(r['.DATA']['.DIFF']);
				self.whenChanged().callThen();
				
				self.upload(options).then(function(){
					p.callThen();
					
				}).catch(function(){
					if(!p.catchCalled)p.callCatch();
				})
				
			}
			else 
			{
				if(r['.COMMENTS']=='Authentication required.')
				{
					var ar=opn.cloud.getMe().whenAuthenticationRequired();
					ar.callThen();
					ar.reset();
				}
				p.setObject(r);
				if(!p.catchCalled)p.callCatch();
			}
		}).catch(function(request){
			
			if(!p.catchCalled)p.callCatch();
		});
		
		
	});
	
	var makeThumbnail=function(img,size,format,smoothing,square){
		var canvas=document.createElement("canvas");
		var ctx=canvas.getContext('2d');
		var x=0;
		var y=0;
		var w=0;
		var z=0;
		if(img.width>=img.height){
			canvas.width=Math.min(size,img.width);
			if(square){
				canvas.height=canvas.width;x=0;w=canvas.width;h=Math.round(img.height*canvas.width/img.width);y=Math.round((canvas.height-h)/2);
			}
			else {
				canvas.height=Math.round(img.height*canvas.width/img.width);x=0;y=0;w=canvas.width;h=canvas.height;
				}
		}
		else{
			canvas.height=Math.min(size,img.height);
			if(square){
				canvas.width=canvas.height;y=0;h=canvas.height;w=Math.round(img.width*canvas.height/img.height);x=Math.round((canvas.width-w)/2);
			}
			else {
				canvas.width=Math.round(img.width*canvas.height/img.height);x=0;y=0;w=canvas.width;h=canvas.height;
				}
		}
		ctx.imageSmoothingEnabled=smoothing;
		ctx.imageSmoothingQuality="high";
		if(format=='PNG'){
		 ctx.drawImage(img,0,0,img.width,img.height,x,y,w,h);
		 return canvas.toDataURL('image/png');
		}else{
			ctx.fillStyle = "#FFFFFF";
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			var rows=Math.ceil(canvas.height/16);
			var columns=Math.ceil(canvas.width/32);
			for (var i = 0; i < rows; i++) {
		        for (var j = 0; j < columns; j++) {
		            ctx.rect(32*j+(i%2?0:16),i*16,16,16);
		        }
		    }
			ctx.fillStyle='#EEEEEE';
			ctx.fill();
			ctx.drawImage(img,0,0,img.width,img.height,x,y,w,h);
			return canvas.toDataURL('image/jpeg',0.92);
		}
	};
	
	var uploadimagefile=function(){
		var reader=new FileReader();
		reader.onload=function(event){

			var url=URL.createObjectURL(file);

			var img=new Image();
			img.onload=function(){

				var url=makeThumbnail(img,256,'PNG',false,true);
				
				opn.http(url,{responseType:"arraybuffer"}).then(function(r){
					encrypt(new Uint8Array(r.response)).then((b)=>{
						pr.icon=b;
						pr.oneMoreDone();
					});
				});

				var url=makeThumbnail(img,1024,'JPG',true,false);
				
				opn.http(url,{responseType:"arraybuffer"}).then(function(r){
					encrypt(new Uint8Array(r.response)).then((b)=>{
						pr.preview=b;
						pr.oneMoreDone();
					});
				});

				pr.image=new Uint8Array(reader.result);
				pr.width=img.width;
				pr.height=img.height;
				pr.oneMoreDone();

			};
			img.src=url;


		}
		reader.readAsArrayBuffer(file);
	};
	
	var uploadimagebuffer=function(){
		
		var b=new Blob([file]);
			var img=new Image();
			img.onload=function(){

				var url=makeThumbnail(img,256,'PNG',false,true);
				
				opn.http(url,{responseType:"arraybuffer"}).then(function(r){
					encrypt(new Uint8Array(r.response)).then((b)=>{
						pr.icon=b;
						pr.oneMoreDone();
					});
				});

				var url=makeThumbnail(img,1024,'JPG',true,false);
				
				opn.http(url,{responseType:"arraybuffer"}).then(function(r){
					encrypt(new Uint8Array(r.response)).then((b)=>{
						pr.preview=b;
						pr.oneMoreDone();
					});
				});

				pr.image=new Uint8Array(file);
				pr.width=img.width;
				pr.height=img.height;
				pr.oneMoreDone();
			};
			img.src=URL.createObjectURL(b);
		
	};
	
	this.whenReady().then(function(){
		if(file instanceof File)
			uploadimagefile();
		else if(file instanceof ArrayBuffer)
			uploadimagebuffer();
	});
	return p;
};

opnCloudObject.prototype.uploadChildren=function(files,options)
{
	var opt=options||{};
	
	var progress=opt.progress;
	var p=new opnPromise(this);
	if(typeof progress==='undefined')progress=new opnProgress();
	if(progress!=opn.getProgress()){
		progress.whenOneMoreToDo().then(function(n){opn.getProgress().oneMoreToDo(n);});
		progress.whenOneMoreDone().then(function(n){opn.getProgress().oneMoreDone(n);});
	}	
	var s=this;
	
	
	function perform_upload(file)
	{	
	var o=opn.cloud.getMe().newObject();//We request from the server to create a new object
	progress.oneMoreToDo(4);
	o.whenReady().then(function(o){//when the server creates the object
		progress.oneMoreDone();
		o.rename(file.name).then(function(){//we request from the server to rename the object
			progress.oneMoreDone();
			s.add(o).then(function(){//we request from the server to add this file into a particular folder
				progress.oneMoreDone();

				//We send the binary data from the file to the server
				o.upload({file:file,progress:progress}).then(function()
				{
					progress.oneMoreDone();
					s.update();
					p.setObject(o);
					p.callThen();
				}).catch(function(){
					progress.oneMoreDone();
				});
				
			}).catch(function(){
				progress.oneMoreDone(2);
			});
		}).catch(function(){
			progress.oneMoreDone(3);
		});
	}).catch(function(){
		progress.oneMoreDone(4);
		
		//if permission denied prompt login
		
	});	
	}
	
	for(var i=0;i<files.length;i++)
	{
		perform_upload(files[i]);
	}
	return p;
};

/**
 * This method downloads the data file of this cloud object.
 * @param options An optional object with one or more of the following fields: type (a string with the desired format of data delivery such as "string","blob","url". The default format is Uint8Array.).
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.download=function(options)
{
	var opt=options||{};
	if(this.info && this.getSystemProperty('MIME'))opn.default(opt,{mime:this.getSystemProperty('MIME')});
	return opn.cloud.download(this.getId(),opt);
};


/**
 *This method returns the system property with the given name. Make sure that the file has been loaded (using whenReady) before calling this method.
 *@param String The name of the requested system property.
 *@return object The value of the requested system property.
 */
opnCloudObject.prototype.getSystemProperty=function(name){
	return this.info['.'+name];
}
opnCloudObject.prototype.setSystemProperty=function(name,v){
	 this.info['.'+name]=v;
}
/**
 *This method returns the list of the children cloud objects of this object. Make sure that the file has been loaded (using whenReady) before calling this method.
 *@return object An associative list with the children objects of this file indexed by their IDs.
 */
opnCloudObject.prototype.getContentList=function()
{
	return this.getSystemProperty('LIST')||{};
};

/**
 *This method returns a child cloud object with a given ID. Make sure that the file has been loaded (using whenReady) before calling this method.
 *@return opnCloudObject The desired child cloud object or null if this ID does not correspond to a child of this object.
 */
opnCloudObject.prototype.getChildById=function(id)
{
	if(this.getSystemProperty('LIST')[id]) return opn.cloud.getObject(id);
	else return null;
};

/**
 *This method returns the ID of a child cloud object with a given name. Make sure that the file has been loaded (using whenReady) before calling this method.
 *@return string The ID of the desired child cloud object or null if this name does not correspond to a child of this object.
 */
opnCloudObject.prototype.getChildIdByName=function(name)
{
	for(var id in this.getSystemProperty('LIST'))
	{
		if(this.getSystemProperty('LIST')[id]['.NAME']==name)
			return id;
	}
	return null;
};

/**
 *This method returns a child cloud object with a given name. Make sure that the file has been loaded (using whenReady) before calling this method.
 *@return opnCloudObject The desired child cloud object or null if this name does not correspond to a child of this object.
 */
opnCloudObject.prototype.getChildByName=function(name)
{
	var id=this.getChildIdByName(name);
	if(id)return opn.cloud.getObject(id);
	return null;
};

/**
 * This method adds a given cloud object as a child of this object.
 * @param opnCloudObject Another cloud object to be added as a child of this object.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.add=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('addtolist',{OID:obj.getId(),LID:this.getId()},p);
	});});
	return p;
};


opnCloudObject.prototype.setOpenWith=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('openwith',{OPEN:obj.getId(),OID:this.getId()},p);
	});});
	return p;
};

opnCloudObject.prototype.setOpenWithId=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('openwith',{OPEN:obj_oid,OID:this.getId()},p);
	});
	return p;
};

opnCloudObject.prototype.handleCommand=function(name,data,p){
	var self=this;
	opn.cloud.command(name,data).then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS'])
		{
			r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],self.info);
			self.applyDiff(r['.DATA']['.DIFF']);
			p.callThen();
			self.whenChanged().callThen();
		}
		else 
		{
			console.log(r['.COMMENTS']);
			if(r['.COMMENTS']=='Authentication required.')
			{
				var ar=opn.cloud.getMe().whenAuthenticationRequired();
				ar.callThen();
				ar.reset();
			}
			p.setObject(r);
			p.callCatch();
		}
	}).catch(function(request){		
		p.callCatch();
	});
}

/**
 * This method modifies the permission of an object by linking it with another object, whose authorized users form a permission group for this object.
 * The possible types of permissions are: 'download' (content), 'upload' (content), 'read' (metadata), 'write' (metadata), 'permissions' (who can modify permissions)
 * Example:
 * 
  	var group=me.newObject();
	group.whenReady().then(function(group){
		console.log('group was created');
		var o=me.installLinkData({OID:group.getId(),TYPE:'AppData',UID:user_id,AUTHORIZED:true});
		o.whenReady().then(function(o){
			console.log('user was added to the group');
		});
		var object=me.newObject();
		object.whenReady().then(function(object){
			console.log('object was created');
			object.setPermissions(group,'download').then(function(){
				console.log('permissions successfully set');
			});
		});
	});
 
    
 */
opnCloudObject.prototype.setPermissions=function(obj,type)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('setpermissions',{GROUP:obj.getId(),TYPE:type,OID:this.getId()},p);
	});});
	return p;
};

opnCloudObject.prototype.setPermissionsId=function(obj_oid,type)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('setpermissions',{GROUP:obj_oid,TYPE:type,OID:this.getId()},p);
	});return p;
};

opnCloudObject.prototype.setCreator=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('setcreator',{UID:obj.getId(),OID:this.getId()},p);
	});});
	return p;
};

opnCloudObject.prototype.setCreatorId=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('setcreator',{UID:obj_oid,OID:this.getId()},p);
	});return p;
};

opnCloudObject.prototype.setLink=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('setlink',{LINK:obj.getId(),OID:this.getId()},p);
	});});return p;
};

opnCloudObject.prototype.setLinkId=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('setlink',{LINK:obj_oid,OID:this.getId()},p);
	});return p;
};

opnCloudObject.prototype.setIcon=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('seticon',{ICON:obj.getId(),OID:this.getId()},p);
	});});return p;
};

opnCloudObject.prototype.setIconId=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('seticon',{ICON:obj_oid,OID:this.getId()},p);
	});return p;
};

opnCloudObject.prototype.setPreview=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
	obj.whenReady().then(()=>{
		this.handleCommand('setpreview',{IMAGE:obj.getId(),OID:this.getId()},p);
	});});return p;
};

opnCloudObject.prototype.setPreviewId=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('setpreview',{IMAGE:obj_oid,OID:this.getId()},p);
	});return p;
};

/**
 * This method adds a given cloud object as a child of this object.
 * @param string A string with the unique ID of a cloud object to be added as a child of this object.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.addById=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('addtolist',{OID:obj_oid,LID:this.getId()},p);
	});return p;
};

/**
 * This method removes a given cloud object from the children of this object.
 * @param opnCloudObject A cloud object to be removed from the children of this object.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.remove=function(obj)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('removefromlist',{OID:obj.getId(),LID:this.getId()},p);
	});return p;
};

/**
 * This method removes a given cloud object from the children of this object.
 * @param string A string with the unique ID of the cloud object to be removed from the children of this object.
 * @return opnPromise A promise object associated with the result of this request.
 */
opnCloudObject.prototype.removeById=function(obj_oid)
{
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('removefromlist',{OID:obj_oid,LID:this.getId()},p);
	});return p;
};

/** 
 * This class contains the information and functionality of a op.n cloud user. Objects of this class are generated by opn.cloud.getObject or other methods such as opn.cloud.getMe().newObject. A file in the VN cloud has a list of metadata fields that can be edited using this class, and possibly a data file (such as a binary or a text file). In addition a file may contain other files and thus behave as a folder.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * var me=opn.cloud.getMe();	<br>
 * <br>
 *	me.whenReady().then(function(){<br>
 *		console.log('already logged in');<br>
 *	}).otherwise(function(){<br>
 *		console.log('not logged in');<br>
 * //here you can prompt login with me.login<br>
 *	});<br>
 *	<br>
 *	me.whenLogin().then(function(){<br>
 *		console.log('just logged in');<br>
 *	});<br>
 *	<br>
 *	me.whenLogout().then(function(){<br>
 *		console.log('just logged out');	<br>
 *	});<br>
 *	<br>
 *	me.whenAuthenticationRequired().then(function(){<br>
 *		console.log('authentication required');<br>
 *	});<br></font>
 */
function opnCloudUser(id)
{
	opnCloudObject.call(this);
	
	this._login_w=null;
	this._login_p=new opnPromise(this);
	this._logout_p=new opnPromise();
	this._auth_p=new opnPromise();
	this._system_list={};
	if(id) this._uid=id;
}

opnCloudUser.prototype.ping=function(){
	var p=new opnPromise(this);
	this.whenReady().then(()=>{
		this.handleCommand('me',{PING:true},p);
	});return p;
};

/**
 * This method resets the user object by downloading again the metadata and creating a new promise object for whenReady. 
 */
opnCloudUser.prototype.reset=function()
{
	this.ready_promise=new opnPromise(this);
	delete this.info;
	this._system_list={};
	
	var o=this;
	if(typeof this._uid==='undefined')
	opn.cloud.command('me').then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS'])
		{
			o.lastSession=r['.DATA']['lastSession'];
			
			r=r['.DATA']['INFO'];
			r=opnCloud.progress(r);
			
			o.info=r;
			o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
			o.whenReady().callThen();
			o.whenChanged().callThen();
		}
		else 
		{
			console.log(r['.COMMENTS']);
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
	else
	opn.cloud.command('info',{OID:this._uid}).then(function(request){
		
		var r=JSON.parse("{\"data\":["+request.responseText+"]}");
		var r=opnCloud.progress(r.data);
		
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
		else 
		{
			console.log(r['.COMMENTS']);
			o.info=r;
			o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
			o.whenReady().callThen();
			o.whenChanged().callThen();
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
};

/**
 * This method creates a new cloud object.
 * @param CLASS An optional parameter with a string that contains the type of the object, such as "List", "App", "Link", etc. Case sensitive.
 * @return opnCloudObject The cloud object that was created after this request.
 */
opnCloudUser.prototype.newObject=function(dat)
{
	var o=new opnCloudObject();
	var data=dat||{};
	if (typeof dat === 'string' )data={CLASS:dat};
	var f='new';
	if(data.CLASS)
	{
		if(data.CLASS=='List')f='newlist';
		else if(data.CLASS=='App'||data.CLASS=='AppData')f='newapp';
		else if(data.CLASS=='Link')f='newlink';
		else if(data.CLASS=='User')f='newuser';
		//else if(CLASS=='3D Model')f='new3dmodel';
	}
	opn.cloud.command(f,data).then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS'])
		{
			r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']],self.info);
			o.applyDiff(r['.DATA']['.DIFF']);	
			o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
			o.whenReady().callThen();
			o.whenChanged().callThen();
		}
		else 
		{
			if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
	return o;
};

/**
 * If this is the first time that this user attempts to access this data file, a new data file is created for this user and returned. If the user has already such data file, the installation fails (whenReady().otherwise() will be called in the returned object). 
 * @param oid A string with the ID of the app data object.
 * @return opnCloudObject The cloud object that corresponds to this request.
 */
opnCloudUser.prototype.installAppData=function(oid){
	return this.installLinkData(oid,'AppData');
};
opnCloudUser.prototype.installSandbox=function(oid){
	return this.installLinkData(oid,'Sandbox');
};
opnCloudUser.prototype.installLinkData=function(oid,type,authorized,uid)
{
	var data={};
	if(typeof oid==='string'){
		data={OID:oid,TYPE:type};
		if(authorized){
			data.AUTHORIZED='true';
			data.UID=uid;
		}
	}else{
		data=oid;
	}
	
	var o=new opnCloudObject();
	if(typeof this._uid==='undefined')
	opn.cloud.command('installlinkdata',data).then(function(request){
		var r=JSON.parse("{\"data\":["+request.responseText+"]}");
		r=opnCloud.progress(r.data);
		if(r['.SUCCESS'])
		{
			var lnk=new opnCloudObject();	
			r['.DATA']['.DIFF']=opnCloud.progress([r['.DATA']['.DIFF']]);
			lnk.applyDiff(r['.DATA']['.DIFF']);
			lnk.id=new opnCloudObjectID(lnk.getSystemProperty('OID'));
			console.log(lnk.getSystemProperty('OID')+' '+data.TYPE+' installed');
			lnk.whenReady().callThen();
			
			if(lnk.getSystemProperty('CLASS')=='Link'){
				
					//console.log('New Link!');
					var oo=opn.cloud.getMe().newObject();
					oo.whenReady().then(function(){
						lnk.setLink(oo).then(function(){
							o.info=oo.info;
							o.id=oo.id;
							o.whenReady().callThen();
						}).catch(function(){		
							o.whenReady().callCatch();
						});
					}).catch(function(){		
						o.whenReady().callCatch();
					});
				
			}
			else //This should never happen.
			{
				console.log('error');
				o.whenReady().callCatch();
			}
			
		}
		else 
		{
			if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
	else o.whenReady().callCatch();
		
	return o;
};

/**
 * This method returns an application data file of this user. If this user does not have such a file, this request will fail (whenReady().otherwise() will be called in the returned object).
 * @param oid A string with the ID of the app data object.
 * @return opnCloudObject The cloud object that corresponds to this request.
 */
opnCloudUser.prototype.getAppData=function(oid,installifneeded){
	if(installifneeded) return this.getLinkDataInstalled(oid,'AppData');
	return this.getLinkData(oid,'AppData');
};
opnCloudUser.prototype.getSandbox=function(oid,installifneeded){
	if(installifneeded) return this.getLinkDataInstalled(oid,'Sandbox');
	return this.getLinkData(oid,'Sandbox');
};

/**
 * @param data An object with OID, TYPE, AUTHORIZED, UID
 * @return opnCloudObject The cloud object that corresponds to this request.
 */
opnCloudUser.prototype.getLinkData=function(oid,type,authorized)
{
	var data={};
	if(typeof oid==='string'){
		data={OID:oid,TYPE:type};
		if(authorized)
			data.AUTHORIZED='true';
	}else{
		data=oid;
	}
		
	var o=new opnCloudObject();
	
	opn.cloud.command('getlinkdata',data).then(function(request){
		var r=JSON.parse("{\"data\":["+request.responseText+"]}");
		r=opnCloud.progress(r.data);
		if(r['.SUCCESS']===false)
		{
			if(r['.COMMENTS']=='Authentication required.')
					{
						var ar=opn.cloud.getMe().whenAuthenticationRequired();
						ar.callThen();
						ar.reset();
					}
			o.whenReady().setObject(r);
			o.whenReady().callCatch();
		}
		else 
		{
			if(r['.CLASS']=='Link'){
				var lnk=new opnCloudObject();
				lnk.info=r;
				lnk.id=new opnCloudObjectID(lnk.getSystemProperty('OID'));
				lnk.whenReady().callThen();
				
				if(lnk.getSystemProperty('LINK')){
					//console.log('Link Found!');
					var oo=opn.cloud.getObject(lnk.getSystemProperty('LINK'));
					oo.whenReady().then(function(){
						o.info=oo.info;
						o.id=oo.id;
						o.whenReady().callThen();
					}).catch(function(){		
						o.whenReady().callCatch();
					});
				}
				else{
					//console.log('New Link!');
					var oo=opn.cloud.getMe().newObject();
					oo.whenReady().then(function(){
						lnk.setLink(oo).then(function(){
							o.info=oo.info;
							o.id=oo.id;
							o.whenReady().callThen();
						}).catch(function(){		
							o.whenReady().callCatch();
						});
					}).catch(function(){		
						o.whenReady().callCatch();
					});
				}
			}
			else //backwards compatibility
			{
				o.info=r;
				o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
				o.whenReady().callThen();
			}
			
		}
	}).catch(function(request){		
		o.whenReady().callCatch();
	});
	return o;
};

/**
 * This method returns an application data file of this user. If this is the first time that this user attempts to access this data file, a new data file is created for this user and returned.
 * @param oid A string with the ID of the app data object.
 * @return opnCloudObject The cloud object that corresponds to this request.
 */
opnCloudUser.prototype.getAppDataInstalled=function(oid){
	return this.getLinkDataInstalled(oid,'AppData');
};

opnCloudUser.prototype.getLinkDataInstalled=function(oid,type)
{
	var o=new opnCloudObject();
	var self=this;
	
		var o2=self.getLinkData(oid,type);
		o2.whenReady().then(function(){
			
			o.info=o2.info;
			o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
			o.whenReady().callThen();
			
		}).catch(function(e){	
		
			//if first time then install
			if(e['.COMMENTS']=='Link not installed.')
			{
				var o3=self.installLinkData(oid,type);
				o3.whenReady().then(function(){
					o.info=o3.info;
					o.id=new opnCloudObjectID(o.getSystemProperty('OID'));
					o.whenReady().callThen();
				}).otherwise(function(e){	
					o.whenReady().setObject(e);
					o.whenReady().callOtherwise();
				});
			}
			else 
			{
				o.whenReady().setObject(e);
				o.whenReady().callOtherwise();
			}
		});
	
	return o;
};

/**
 * This method returns a window object to be shown when the session of the user expires. This method guarantees that the same one window will be shown even if the whenAuthenticationRequired event is handled by more than one callback functions. 
 * @param wm A WindowManager object that will handle the window to be generated.
 * @return VNWindow The generated window. It is hidden by default.
 */
opnCloudUser.prototype.getSessionExpiredWindow=function(wm)
{
	if(this._expwin)return this._expwin;
	
	if(typeof wm=='undefined')wm=opn.getWindowManager();
	var w_=wm.createWindow({width:330,height:120});
	w_.block(false);
	w_.setCanClose(false);
	w_.setCanMinimize(false);
	w_.setCanMaximize(false);
	w_.setCanResize(false);
	w_.setIcon(opn.logo.url);
	w_.hide();
	this._expwin=w_;
	return w_;
};

/**
 * This method returns a window object to be shown when the user logs out. 
 * @param wm A WindowManager object that will handle the window to be generated.
 * @return VNWindow The generated window.
 */
opnCloudUser.prototype.showLoggedOutWindow=function(wm)
{
	if(typeof wm=='undefined')wm=opn.getWindowManager();
	
	var w=this.getSessionExpiredWindow(wm);
	w.setTitle('Logged out.');
	w.getContentDiv().style.background='rgba(0,0,0,0)';
	w.show();
	wm.createNotification('Logged out.',{background:'rgb(128,98,165)'});

	opn.wait({seconds:3}).then(function(){window.location.reload();});
	
	var requestMethod=document.exitFullscreen||document.webkitExitFullscreen||document.mozExitFullscreen||document.msExitFullscreen;
	if(requestMethod)requestMethod.call(document);
	return w;
};

opnCloudUser.prototype.loginWithDiv=function(div){
	
	var p=new opnPromise();
	var self=this;
	p.then(function(){self.reset();self.whenReady().then(function(){self._login_p.callThen();self._login_p.reset();});});
	
	
	var i=document.createElement('iframe');
	i.style.width='100%';
	i.style.height='100%';
	i.style.border='0px';
	i.src=opn.hosturl+'do/login.php?CID='+CID_COOKIE;
	p.reloadIframe=function(){
		i.src=i.src;
	};
	if(typeof div ==='undefined')div=opn.getScreen();
	div.innerHTML="";
	div.appendChild(i);
	
	function receiveMessage(evt)
	{
		if(evt.data.indexOf('authenticated')==0) 
		{
			if(evt.data.indexOf('SID=')!=-1)
				parseCookiesFallback(evt.data);
			else
				parseCookies();
			
			i.remove();
			window.removeEventListener("message",receiveMessage);
			p.callThen();
		}
	}
	
	window.addEventListener("message", receiveMessage, false);
	return p;
	
};

/**
 * This method logs in the user so that various VN cloud operations can be performed such as create new files, or modify existing ones. If this request is successful, the whenLogin event will be triggered.
 * @param wm A WindowManager object that will handle the login window if shown.
 * @param directly An optional boolean parameter that forces the login window to be open, even if the user is already logged in. By default this parameter is false, which bypasses the window if the user is already logged in. 
 * @return opnPromise A promise object that corresponds to the result of this request.
 */
opnCloudUser.prototype.login=function(wm)
{
	if(this._login_w)
		return this._login_w;
	
	var opt={wm:wm};
	if(typeof opt.wm==='undefined')opt.wm=vn.getWindowManager();
	
	this._login_w=new opnPromise();
	var p=this._login_w;
	var self=this;
	p.then(function(){self._login_w=null;}).catch(function(){self._login_w=null;});
	function create_win(url)
	{
		if(typeof opt.wm=='undefined')return;
		var w_=opt.wm.createWindow({width:330,height:180});
		w_.block(false);
		w_.setCanClose(true);
		w_.setCanMinimize(false);
		w_.setCanMaximize(false);
		w_.setCanResize(false);
		w_.setTitle('Login');
		w_.setIcon(vn.logo.url);
		
		var d=w_.getContentDiv();
		var pp=self.loginWithDiv(d);
		pp.then(function(){
			w_.destroy();
			p.callThen();
		});
		
		var decoration_width=w_.getWidth()-parseInt(d.clientWidth);
		var decoration_height=w_.getHeight()-parseInt(d.clientHeight);
		w_.setSize(330+decoration_width,180+decoration_height);
		w_.center();
		
		w_.whenClosed().then(function(){
			pp.reloadIframe();
			w_.cancelClosing();
		});
	}
	
	create_win(vn.hosturl+'do/login.php');
	
	return p;
};


/**
 * This method logs out the user from an existing VN cloud session. If this request is successful, the whenLogout event will be triggered.
 * @return opnPromise A promise object that corresponds to the result of this request.
 */
opnCloudUser.prototype.logout=function(wm)
{
	var self=this;
	var p=new opnPromise();
	opn.cloud.command('logout').then(function(request){
		var r=JSON.parse(request.responseText);
		if(r['.SUCCESS'])
		{
			SID_COOKIE='';
			UID_COOKIE='';
			self.reset();
			self._logout_p.callThen();
			self._logout_p.reset();
			p.callThen();
		}
		else 
		{
			p.callCatch();
		}
	}).catch(function(request){		
		p.callCatch();
	});
	
	
	return p;
}

/** 
 * This method returns a promise object that is triggered when this user logs in.
 * @return opnPromise The promise object that is associated with this event. 
 */
opnCloudUser.prototype.whenLogin=function(){return this._login_p;};
/** 
 * This method returns a promise object that is triggered when this user logs out.
 * @return opnPromise The promise object that is associated with this event. 
 */
opnCloudUser.prototype.whenLogout=function(){return this._logout_p;};
/** 
 * This method returns a promise object that is triggered when this user needs to authenticate because the existing session expired.
 * @return opnPromise The promise object that is associated with this event. 
 */
opnCloudUser.prototype.whenAuthenticationRequired=function(){return this._auth_p;};

opn.extend(opnCloudObject,opnCloudUser);
opnCloudUser.prototype.upload=undefined;


function opnCloudEncoderInstance()
{
	var worker=new Worker(opn._cloud_encoder);
	var _p=[];
	
	worker.onmessage=function(e)
	{
		var data=e.data;
		var p=_p.shift();
		if(data.error){
			p.callCatch({
				object:data.error
			})
			//worker.terminate();
		}
		else{
			p.callThen({
				object:data.output
			});
			//worker.terminate();
		}
	};
	
	this.decode=function(data){
		var p=new opnPromise();
		_p.push(p);
		worker.postMessage({decode:data});
		return p;
	};
	
	this.encode=function(data){
		var p=new opnPromise();
		_p.push(p);
		worker.postMessage({encode:data});
		return p;
	};

	
	this.terminate=function(){worker.terminate();};
}

function opnCloudEncoder()
{
	var instance=[];
	var next=0;
	
	var init=function()
	{
		if(instance.length==0)
		{
			for(var i=0;i<opn.cloud_threads;i++)instance[i]=new opnCloudEncoderInstance();
			next=instance.length-1;
		}
	}
	
	var nextID=function()
	{
		next+=1;
		if(next>=instance.length)next=0;
		return next;
	}
	
	this.decode=function(data){
		init();
		return instance[nextID()].decode(data);		
	};
	
	this.encode=function(data){
		init();
		return instance[nextID()].encode(data);	
	};
	
	this.terminate=function(){
		for(var i=0;i<instance.length;i++)instance[i].terminate();
	};
	
	this.format=function(b,opt){
		if(opt)
		{
			var t=opt.type||"";
			t=t.toLowerCase();
			if(t=='string'){
				if(typeof TextDecoder!=='undefined')return new TextDecoder("utf-8").decode(b);
				else{
					var byteArray = new Uint8Array(b);
					var str = "", cc = 0, numBytes = 0;
					for(var i=0, len = byteArray.length; i<len; ++i){
						var v = byteArray[i];
						if(numBytes > 0){
							//2 bit determining that this is a tailing byte + 6 bit of payload
							if((v&192) === 128){
								//processing tailing-bytes
								cc = (cc << 6) | (v & 63);
							}else{
								throw new Error("this is no tailing-byte");
							}
						}else if(v < 128){
							//single-byte
							numBytes = 1;
							cc = v;
						}else if(v < 192){
							//these are tailing-bytes
							throw new Error("invalid byte, this is a tailing-byte")
						}else if(v < 224){
							//3 bits of header + 5bits of payload
							numBytes = 2;
							cc = v & 31;
						}else if(v < 240){
							//4 bits of header + 4bit of payload
							numBytes = 3;
							cc = v & 15;
						}else{
							//UTF-8 theoretically supports up to 8 bytes containing up to 42bit of payload
							//but JS can only handle 16bit.
							throw new Error("invalid encoding, value out of range")
						}

						if(--numBytes === 0){
							str += String.fromCharCode(cc);
						}
					}
					if(numBytes){
						throw new Error("the bytes don't sum up");
					}
					return str;
				}
			}
			else if(t=='blob')
			{
				if(opt.mime)return new Blob([b],{type:opt.mime});
				else return new Blob([b]);
			}
			else if(t=='url'){
				if(opt.mime){
				var blob=new Blob([b],{type:opt.mime});
				return URL.createObjectURL(blob);}
				else {
				var blob=new Blob([b]);
				return URL.createObjectURL(blob);}
			}
			return b;
		}
		else return b;
	};
}


opn.set(window,{opnCloud, opnCloudObject, VNCloudObject:opnCloudObject, opnCloudUser, VNCloudUser:opnCloudUser, opnCloudObjectID, VNCloudObjectID:opnCloudObjectID});
})(window);