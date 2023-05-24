/* V1.20
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
 * This is the main class of the op.n API. One global object of this class is created and accessible under the name "opn". 
 * Therefore, all methods of this class are accessible by "opn.methodname". To run an application with the fully loaded op.n API,
 * you need to run it using "opn.run(my_applicaton);", where "my_application" is the main function of your application.
 */
 (function(window){
function OPNAPI()
{
	this.version="1.20";
	this.progress=new opnProgress();
	this.libs={};
	this.global={};
	this.lib_versions={
		"opn.cloud":"12",
		"opn.cloud-encoder":"1"
		};
		
	this.lib_index=["opn.cloud"];
}


OPNAPI.prototype.loadConfig=function(options){
	var p=new opnPromise();
	var self=this;
	
	var scripts = document.getElementsByTagName('script');
	var url='';
	for(var i=0; url.length==0 && i<scripts.length;i++){
		if(scripts[i].src){
		 var ind=scripts[i].src.indexOf('/js/opn-');
		 if(ind>0)url=scripts[i].src.substring(0,ind+1);
		}
	}
	
	this.http(url+'do/settings.json',{method:'get'}).then(function(r){
		if(r.response.indexOf("{")!=0){
			window.location.href="do/setup";
			return;
		}
		
		var j=JSON.parse(r.response);
		
		for(var i in j){
			self[i]=j[i];
		}
		
		self.hosturl='';
		if(self.hostname.length>0)
		self.hosturl=((self.hostForcesHTTPS||'https:' == document.location.protocol) ? 'https:' : 'http:')+'//'+self.hostname+'/';
		
		if(self.static)self.hosturl=url;
		
		if(self.logo){
			if(self.logo.url)self.logo.url=self.hosturl+self.logo.url;
			if(self.logo.animated){
				if(self.logo.animated.url)self.logo.animated.url=self.hosturl+self.logo.animated.url;
				if(self.logo.animated.white){
					if(self.logo.animated.white.url)self.logo.animated.white.url=self.hosturl+self.logo.animated.white.url;
				}
			}
		}
		var opt=options||{};
		if((j['initStatus']==="WAR_LOADED"||j['initStatus']==="INITIALIZED")&&(!opt.skipSetup)){
			if(window.location.href!=self.hosturl+"do/setup")
			window.location.href=self.hosturl+"do/setup";
		}
		
		p.callThen();
	}).otherwise(function(){
		p.callCatch();
	});
	return p;
}
/**
 * This method returns the default window manager object (if exists) which creates and controls a window system. 
 * You can easily create and handle window elements using the createWindow() method (see WindowManager class). 
 * A default window manager is automatically created when the body of your HTML document is empty. 
 * Otherwise a window manager is generated after calling the method setScreen(). <br><br>
 * <b>Example:</b><br><font style="font-family:Courier">
 * var wm=opn.getWindowManager();<br>
 * var win=wm.createWindow({left:100,top:100,width:400,height:300});<br>
 * win.setTitle('My window');<br>
 * var window_div=win.getContentDiv();<br></font>
 * @return WindowManager The default window manager object, if exists. If not, the method setScreen() must be called prior to getWindowManager().
 */
OPNAPI.prototype.getWindowManager=function(){return opn._wm;};
OPNAPI.prototype.setWindowManager=function(wm){opn._wm=wm;};
/**
 * This method sets a div element as the main area for the op.n API.
 * @param div A div element or a string with the id of an existing element.
 */
OPNAPI.prototype.setScreen=function(div){
	if(typeof div=='string')this._screen=document.getElementById(div);
	else this._screen=div;
};
/**
 * This method returns the div container that covers the entire area of the browser window or another area that you have set using setScreen(). You can use it to append children elements to it.<br><br>
 * <b>Example:</b><br><font style="font-family:Courier">
 * var div=opn.getScreen();<br></font>
 * @return div A div element that covers the entire area of the browser window.
 */
OPNAPI.prototype.getScreen=function(){
	
	if(this._screen){}
	else
	{
	   document.body.style.margin='0px';
	   this._screen=document.createElement('div');
	   opn.set(this._screen.style,{position:'absolute',top:'0px',left:'0px',right:'0px',bottom:'0px',overflow:'hidden'});
	   document.body.appendChild(this._screen);
	}
	
	return this._screen;
};
/**
 * This method runs asynchronously a given function after having loaded first the core components of the op.n API. It can be used in the onload attribute of the html body element.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * &lt;body onload="opn.run(my_application);"&gt;<br></font>
 * @param program A given function, which is typically the main function of an application.
 */
OPNAPI.prototype.run=function(program,options){
  if(this.init_p)return;
	
  var announcements=function(){
	  
	  opn.cloud.cookies({"GET":true}).then(function(request){
		  var r=JSON.parse(request.responseText);
		  
	  var show_announcement=function(title,text,name,startTime,button_text){
			if(text){
				var found=false;
				if(r[".DATA"][name]){
					if(startTime-r[".DATA"][name]<0)found=true;
				}
				if(!found){
				remaining+=1;
				var div=document.createElement('div');
				opn.set(div.style,{
					position:'relative',
					left:'0px',
					right:'0px',
					height:'auto',
					padding:'10px',
					//textAlign:'center',
					fontFamily:'Arial',
					backgroundColor:'rgb(128,98,165)',
					color:'white',
					border:'1px solid black',
					cursor:'default',
					display:'flex',
					justifyContent: 'center',
					alignItems: 'center',
					boxShadow:'rgb(136, 136, 136) 0px 10px 10px',
					margin:'10px',
					borderRadius:'10px'
				});
				var txt=document.createElement('div');
				opn.set(txt.style,{
					width:'100%'
				});
				div.appendChild(txt);
				txt.innerHTML='<b>'+title+'</b><br><br>'+text;
				var btn=document.createElement('div');
				opn.set(btn.style,{
					cursor:'pointer',
					fontFamily:'Arial',
					fontWeight:'700',
					fontSize:'24px',
					paddingLeft:'10px',
					paddingRight:'10px',
					border:'2px solid white',
					borderRadius:'15px',
					lineHeight:'normal'
				});
				btn.innerHTML=button_text;
				btn.addEventListener('click',()=>{
					div.remove();
					var now=new Date().getTime();
					opn.cloud.cookies({TYPE:name}).then(()=>{
						remaining-=1;
						if(remaining==0)announcement_div.remove();
					});
				})
				div.appendChild(btn);
				announcement_div.appendChild(div);
				
				}
			  }
		}
		var remaining=0;
		var announcement_div=document.createElement('div');
		opn.set(announcement_div.style,{
			position:'absolute',
			scrollY:'auto',
			top:'0px',
			left:'0px',
			right:'0px',
			bottom:'0px',
			backgroundColor:'rgba(0,0,0,0.2)',
			cursor:'not-allowed',
			zIndex:'100000'
		});
		opn.getScreen().parentElement.appendChild(announcement_div);
			
		show_announcement('Notice',opn.generalAnnouncement,'announcement',opn.startTime,'x');
		show_announcement('Use of Cookies','We and selected partners, use cookies or similar technologies as specified in the <a href="'+opn.privacyPolicyURL+'" style="color:white;" target="_blank">privacy policy</a>. You can consent to the use of such technologies by closing this notice, by interacting with any link or button outside of this notice or by continuing to browse otherwise.','cookies',0,'Accept');
		show_announcement('Personal Data','Information on how we process personal data and instructions for exercising your GDPR rights can be found in the <a href="'+opn.privacyPolicyURL+'" style="color:white;" target="_blank">privacy policy</a>.','GDPR',0,'OK');
			
		if(remaining==0)announcement_div.remove();
	  });
  }	
	
  var p=new opn.Promise();
  var progress=p.getProgress();

  progress.oneMoreToDo();
  this.loadConfig(options).then(()=>{
			
	  var opt=options||{};
	
	  this.removeLoadingLogo=function(){};
	  if(opt.loadingLogo||opt.loadingLogoWhite)
	  {
		  opt.progress=progress;
		  opt.div=document.body;
		  opn.showProgress(opt);
	  }
			
	  progress.oneMoreToDo();
	  opn.http(opn.hosturl+'js/opn/cloud-encoder-'+this.lib_versions['opn.cloud-encoder']+'.js').then((request)=>{
		  this._cloud_encoder=URL.createObjectURL(new Blob([request.response]));
		  this.init_p=this.import();
		  progress.oneMoreToDo();
		  this.init_p.then(()=>{
			  
			  this.cloud=new opnCloud();
			  
			  this.cloud.whenConnected().then(()=>{
				if(opt.skipAnnouncements){}else announcements();
			 	 progress.oneMoreDone();
			  	 program();
				}).otherwise(()=>{
					console.log("Not Connected");
				})
			  
			  
		  });
		  progress.oneMoreDone();
	  });
	  
	  progress.oneMoreDone();
	});
};

OPNAPI.prototype.showProgress=function(options){
	var opt=options||{};
	var l=document.createElement('div');
	if(opt.div){
		  opn.set(l.style,{
		  position:'absolute',
		  left:'0px',
		  top:'0px',
		  bottom:'0px',
		  right:'0px',
		  overflow:'hidden',
		  });
		  opt.div.appendChild(l);
		  var c=document.createElement('div');
		  opn.set(c.style,{
		  position:'absolute',
		  left:'50%',
		  top:'50%',
		  width:'100%',
		  height:'100%'
		  });
		  l.appendChild(c);
		  var a=document.createElement('div');
		  opn.set(a.style,{position:'absolute',
		  width:'128px',
		  height:'128px',
		  top:'-64px',
		  left:'-64px'});
		  c.appendChild(a);  
		 
		  var i=document.createElement('img');
		  i.src=opn.logo.animated.url;
		  if(opt.loadingLogoWhite)i.src=opn.logo.animated.white.url;
		  i.style.width='128px';
		  i.style.height='128px';
		  a.appendChild(i);
		  
		  var t=document.createElement('div');
		  opn.set(t.style,{width:'100%',height:'20px',textAlign:'center',fontFamily:'"Segoe UI Light","Segoe UI","Segoe WP Light","Segoe WP","Segoe UI Latin Light",HelveticaNeue,Helvetica,Tahoma,ArialUnicodeMS,sans-serif'});
		  t.innerHTML='Loading...';
		  a.appendChild(t);
		 
		  var p=document.createElement('div');
		  opn.set(p.style,{width:'100%',height:'3px',background:'#888',position:'absolute',margin:'10px 0px',boxShadow:'0px 0px 5px white'});
		  a.appendChild(p);
		  
		  var p2=document.createElement('div');
		  opn.set(p2.style,{width:'0%',height:'3px',background:'rgb(128,98,165)',position:'absolute',left:'0px',top:'0px'});
		  p.appendChild(p2);
		  
		  var pr=opt.progress||opn.getProgress();
		  pr.whenProgress().then(function(p)
		  {
				p2.style.width=(p.getValue()*100)+'%';
				p2.style.display='block';
		  });
			
		  pr.whenDone().then(function(p)
		  {
			 l.remove();
		  });
	}
	return l;
};
	
/**
 * This method returns a global progress object that can be used to track the overall cumulative status of several asynchronous processes.
 * @return opnProgress A global progress object.
 */
OPNAPI.prototype.getProgress=function(){return this.progress;};
/**
 * This method imports one or more JS files to your application and returns a promise object that is triggered when the importing process has finished. All non-core op.n libraries can be imported as "opn.libname".
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * opn.import(["opn.kinect","my_library.js","another_script.js"]).then(function(){<br>
 * ...<br>
 * }).catch(function(){<br>
 * ...<br>
 * });<br></font>
 * @param libs A string, or an array of strings with the paths or URLs to the script files.
 * @return opnPromise A promise object that is triggered with the completion of the import process. 
 */
OPNAPI.prototype.import=function(src){
	
	var p=new opnPromise();
	var progress=p.getProgress();
	if(typeof src==='undefined')
	{
		return this.import(this.lib_index);
	}
	else if(typeof src==='string') 
	{
		progress.oneMoreToDo();
		this.importSingleScript(src).then(function(){progress.oneMoreDone();p.callThen();}).catch(function(){progress.oneMoreDone();p.callCatch();});
		return p;
	}
	else //assume non-empty array
	{
		if(src.length==1)
		{
			progress.oneMoreToDo();
			this.importSingleScript(src[0]).then(function(){progress.oneMoreDone();p.callThen();}).catch(function(){progress.oneMoreDone();p.callCatch();});
		 	return p;
		 }
		else if(src.length>1)
		{
			progress.oneMoreToDo(src.length);
			var do_next=()=>{
				if(src.length==0)
					p.callThen();
				else this.importSingleScript(src.shift()).then(()=>{
					progress.oneMoreDone();
					do_next();
				}).catch(()=>{
					progress.oneMoreDone();
					p.callCatch();
				});
			}
			do_next();
			return p;
		}
	}
};

/**
 * This method returns true if a given JS file has been imported to your application. 
 * @param lib A string with the path or URL to a script file.
 * @return Boolean The loading status of this script file. 
 */
OPNAPI.prototype.imported=function(src)
{
  if(typeof this.libs[src]!=='undefined') return true; else return false;
};

OPNAPI.prototype.importSingleLib=function(src)
{
	var s=src;
	if(this.lib_versions[src])s+='-'+this.lib_versions[src];
	return this.importSingleScript(this.hosturl+'js/'+s.replace('.','/')+'.js');
};

OPNAPI.prototype.importSingleScript=function(src)
{
  if(src.indexOf('opn.')==0)
  {
	  return this.importSingleLib(src);
  }

	
  var p=new opnPromise();
   
  if(typeof this.libs[src]!=='undefined')
  {
	p.callThen();
	return p;
  }
  var self=this;
  var s,r,t;
  r = false;
  s = document.createElement('script');
  s.type = 'text/javascript';
  s.onerror= function(){
	p.callCatch();  
  };
  s.onload = s.onreadystatechange = function() {
	if ( !r && (!document.readyState || document.readyState == 'complete' || document.readyState == 'loaded') )
    {
	  self.libs[src]=new Object();
      r = true;
      p.callThen();
    }
  };
  s.src = src;
  t = document.getElementsByTagName('script')[0];
  t.parentNode.insertBefore(s, t);
  return p;
};

/**
 * This method extends one Class into another by inheriting all the methods of the superclass. Both classes must be defined (loaded) prior to the call of extend().
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * var ClassA=function(arguments){<br>
 * ...<br>	 
 * };<br>
 * var ClassB=function(arguments){<br>
 * ClassA.call(this,arguments);<br>
 * ...<br>
 * };<br>
 * opn.extend(ClassA,ClassB);<br></font>
 * @param superclass The class to be extended.
 * @param subclass The class that will inherit the methods of the superclass.
 */
OPNAPI.prototype.extend=function(base, sub) {
   var tmp = sub.prototype;
  sub.prototype =Object.create(base.prototype);
  opn.set(sub.prototype,tmp);
  sub.prototype.constructor = sub;
}

/**
 * This method sets the values of specific properties in an object. If the object does not have such properties they will be automatically defined.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * opn.set(my_div.style,{position:'absolute',color:'black'});<br>
 * //The position and color properties of the style object will be updated with these new values.<br></font>
 * @param object The object to be updated.
 * @param properties An object with the properties-values to be updated.
 */
OPNAPI.prototype.set=function(dst,src)
{
	for(v in src)
		dst[v]=src[v];
};

/**
 * This method defines new properties in an object and initializes them with their default values. The properties that already exist in the object will not be modified.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * opn.default(my_div.style,{display:'block',color:'black'});<br>
 * //If the style object does not have the display or color properties, they will be defined and take their default values.<br></font>
 * @param object The object to be updated.
 * @param properties An object with the properties-values to be defined.
 */
OPNAPI.prototype.default=function(dst,src)
{
	for(v in src)
		if(typeof dst[v]==='undefined')dst[v]=src[v];
};

/**
 * This method loads a file using the http request protocol. The request can be send using the "GET" or "POST" methods and can contain 
 * variables as well as file attachments. This method can be used to download static files, send requests to php scripts, upload data to a server etc.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * opn.http("my_script.php",{method:'post',data:{a_variable:'a value', variable2:'value'}}).then(function(request){<br>
 * ...<br>
 * //do something with the response, such as: JSON.parse(request.responseText);<br>
 * }).catch(function(request){<br>
 * ...<br>
 * });<br></font>
 * @param filename A string with the path/URL of the file to be requested.
 * @param options An optional object that may contain the following parameters: "method" with values "get" or "post", "data" with an object that contains the variable parameters to be sent, "files" with an array of binary files to be uploaded as Uint8Array objects, "mime" with a string that contains a mime type such as "text/xml", "responseType" with a string that contains a return data type such as "arraybuffer".
 * @return opnPromise A promise object that is triggered with the completion of the loading process. 
 */
OPNAPI.prototype.http=function(filename,options)
{
	if(typeof options==="undefined")return opn.getHttp(filename);
	var opt=options||{};
	opn.default(opt,{method:"GET"});
	if(document.location.href.indexOf('http')!=0)delete opt.withCredentials;
	if(opt.files)
		return opn.postHttpBinary(filename,opt.data,opt.files,opt.mime,opt.responseType,opt.withCredentials,opt.timeout);
	else if(opt.method.toUpperCase() === "POST")
		return opn.postHttp(filename,opt.data,opt.mime,opt.responseType,opt.withCredentials,opt.timeout);
	else return opn.getHttp(filename,opt.data,opt.mime,opt.responseType,opt.withCredentials,opt.timeout);
};

/**
 * This method loads one or more files from the op.n cloud. The requested files are loaded as variables with the requested name and datatypes such as "app", "string", "blob", "url", and others.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * opn.load([{id:'nywy62fi8x30n8od',type:'app'},{id:'nywy62fi8x30n8od',type:'string',name:'the_code'}]).then(function(data){<br>
 * ...<br>
 * //the requested items are loaded as fields in the variable "data", such as: data.the_code<br>
 * });<br></font>
 * @param input An object or an array of objects with the fields: "id" with the op.n ID of an cloud object, "type" with the desired type, and optionally "name" with the preferred name. 
 * @param options An optional object with one or more of the fields: "progress" with a opnProgress object to track the progress of the loading process.
 * @return opnPromise A promise object that is triggered with the completion of the loading process. 
 */
OPNAPI.prototype.load=function(input,options)
{	
	var opt=options||{}; 
	var p=new opnPromise();
	
	if(opt.caller){p._progress=opt.caller.getProgress();}
	else if(opt.progress){p._progress=opt.progress;}
	else opt.progress=p.getProgress();
	
	var done=0;
	var must_do=0;
	var out={};
	var last_out=null;
	var one_done=function()
	{
		done+=1;
		if(opt.progress)opt.progress.oneMoreDone();
		if(opt.caller)opt.caller.getProgress().oneMoreDone();
		if(done>=must_do)
		{
			//opn.wait is used here in order callThen to be called from a fresh event free of previous evals and thus be able to catch errors if any
			if((input instanceof Array) || must_do>1) opn.wait().then(function(){p.callThen({object:out});});
			else opn.wait().then(function(){p.callThen({object:last_out});});
		}
	};
	
	var do_error=function(){
		done+=1;
		if(opt.progress)opt.progress.oneMoreDone();
		if(opt.caller)opt.caller.getProgress().oneMoreDone();
		p.callOtherwise();
	}
	
	var do_one=function(o)
	{
		var op=o||{};
		if(typeof op.id==='undefined')
		{
			one_done();
			return;
		}
		if(op.type=='app')
		{
			var p_;
			if(opt.caller){
				p_=opt.caller.cache.load(op.id);
			}
			else
			{
				var app=new opnApp();
				p_=app.load(op.id);
			}
			p_.then(function(data){
				for(var c in data)
				{
					if(op.name)
						out[op.name]=data[c];
					else
						out[c]=data[c];
				}
				last_out=data;
				one_done();
			}).otherwise(function(){
				do_error();
			});
		}
		else if(op.type=='string')
		{
			opn.cloud.download(op.id,{type:'string',mime:op.mime,version:op.version,progress:p.getProgress()}).then(function(data,request){
				if(op.name)
					out[op.name]=data;
				else out['string'+(done+1)]=data;
				last_out=data;
				one_done();
			}).otherwise(function(){
				do_error();
			});
		}
		else if(op.type=='url')
		{
			opn.cloud.download(op.id,{type:'url',mime:op.mime,version:op.version,progress:p.getProgress()}).then(function(data,request){
				if(op.name)
					out[op.name]=data;
				else out['url'+(done+1)]=data;
				last_out=data;
				one_done();
			}).otherwise(function(){
				do_error();
			});
		}
		else if(op.type=='blob')
		{
			opn.cloud.download(op.id,{type:'blob',mime:op.mime,version:op.version,progress:p.getProgress()}).then(function(data,request){
				if(op.name)
					out[op.name]=data;
				else out['blob'+(done+1)]=data;
				last_out=data;
				one_done();
			}).otherwise(function(){
				do_error();
			});
		}
		else //Uint8Array
		{
			opn.cloud.download(op.id,{mime:op.mime,version:op.version,progress:p.getProgress()}).then(function(data,request){
				if(op.name)
					out[op.name]=data;
				else out['data'+(done+1)]=data;
				last_out=data;
				one_done();
			}).otherwise(function(){
				do_error();
			});
		}
	};
	
	
	
	if(input instanceof Array)
	{
		must_do=input.length;
		if(must_do==0)
		{
			p.callThen({object:{}});
			return p;
		}
		if(opt.progress)opt.progress.oneMoreToDo(must_do);
		if(opt.caller)opt.caller.getProgress().oneMoreToDo(must_do);
		for(var i=0;i<must_do;i++)
			do_one(input[i]);
	}
	else
	{
		must_do=1;
		if(opt.progress)opt.progress.oneMoreToDo();
		if(opt.caller)opt.caller.getProgress().oneMoreToDo();
		do_one(input);
	}
	return p;
};

OPNAPI.prototype.loadAsLib=function(input,progress){
	var p=new opnPromise();
	var done=0;
	var must_do=0;
	var one_done=function()
	{
		done+=1;
		if(progress)progress.oneMoreDone();
		if(done>=must_do)
		{
			//opn.wait is used here in order callThen to be called from a fresh event free of previous evals and thus be able to catch errors if any
			if((input instanceof Array) || must_do>1) opn.wait().then(function(){p.callThen();});
			else opn.wait().then(function(){p.callThen();});
		}
	};
	
	var do_one=function(id)
	{
		opn.load({id:id,type:'app'},progress).then(function(data){
			for(var i in data)window[i]=data[i];
			one_done();
		});
	};
	
	
	
	if(input instanceof Array)
	{
		must_do=input.length;
		if(must_do==0)
		{
			p.callThen();
			return p;
		}
		if(progress)progress.oneMoreToDo(must_do);
		for(var i=0;i<must_do;i++)
			do_one(input[i]);
	}
	else
	{
		must_do=1;
		if(progress)progress.oneMoreToDo();
		do_one(input);
	}
	return p;
};

OPNAPI.prototype.postHttp=function(url,data,mime,responseType,withCredentials,timeout)
{
	var file_request=new XMLHttpRequest();
	var p=new opnPromise(file_request);
	p.catch(function(){
		console.log(p);
		console.log('E');
	});
	file_request.open("POST",url,true);
	if(timeout)
	{
		file_request.timeout = 10000;
		file_request.ontimeout=function(){p.callCatch();};
	}
	file_request.onreadystatechange=function()
	{
		if (file_request.readyState==4)
		{
			if(file_request.status==200)
			{
				opn.progress.oneMoreDone();
				p.callThen();
			}
			else
			{
				opn.progress.oneMoreDone();
				p.callCatch();
			}
		}
	}
	if(mime) file_request.overrideMimeType(mime);
	else file_request.overrideMimeType("text/plain; charset=x-user-defined");
	if(responseType)file_request.responseType=responseType;
	if(withCredentials)file_request.withCredentials=true;
	file_request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	var msg="";
	if(typeof data!=='undefined')
	{
		var i=0;
		for(v in data)
		{
			if(i==0){msg=v+"="+data[v];i+=1}
			else msg+="&"+v+"="+data[v];
		}
	}
	opn.progress.oneMoreToDo();
	file_request.send(msg);
	return p;
};

OPNAPI.prototype.postHttpBinary=function(url,data,files,mime,responseType,withCredentials,timeout)
{
	var file_request=new XMLHttpRequest();
	var p=new opnPromise(file_request);
	p.catch(function(){
		console.log(p);
		console.log('E');
	});
	file_request.open("POST",url,true);
	if(timeout)
	{
		file_request.timeout = 10000;
		file_request.ontimeout=function(){p.callCatch();};
	}
	file_request.onreadystatechange=function()
	{
		if (file_request.readyState==4)
		{
			if(file_request.status==200)
			{
				opn.progress.oneMoreDone();
				p.callThen();
			}
			else
			{
				opn.progress.oneMoreDone();
				p.callCatch();
			}
		}
	}
	if(mime) file_request.overrideMimeType(mime);
	else file_request.overrideMimeType("text/plain; charset=x-user-defined");
	if(responseType)file_request.responseType=responseType;
	if(withCredentials)file_request.withCredentials=true;
	
	var boundary="opn-----------------------" + (new Date).getTime();
	var CRLF = "\r\n";
	var SEPARATOR="--"+boundary+CRLF;
	var END="--"+boundary+"--"+CRLF;
	
	var message="";
	if(typeof data!=='undefined')
	{
		var i=0;
		for(v in data)
		{
			message+=SEPARATOR+'Content-Disposition: form-data; name="'+v+'"'+CRLF+CRLF+data[v]+CRLF;
		}
	}
	
	var file_data={};
	if(files)
	{
		if(Array.isArray(files))
		{
			for(var i=0;i<files.length;i++)
			{
				if(files[i] instanceof Uint8Array)
				{
					file_data['file'+i]={filename:'file'+i,data:files[i]};
				}
				else file_data['file'+i]=files[i];
			}
		}
		else
		{
			if(files instanceof Uint8Array)
				file_data['file0']={filename:'file0',data:files};
			else if(files.data)
				file_data['file0']=files;
			else file_data=files;
		}
	}
	
	var file_message={};
	var file_message_length=0;
	for(f in file_data)
	{
		file_message[f]=SEPARATOR+'Content-Disposition: form-data; name="'+f+'"; filename="'+((file_data[f].filename)||f)+'"'+CRLF;
		file_message[f]+="Content-Type: application/octet-stream"+CRLF+CRLF;
		file_message_length+=file_message[f].length;
		file_message_length+=file_data[f].data.length;
		file_message_length+=2;//CRLF
	}
		//data
	
	file_request.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
	
	var bin=new Uint8Array(message.length+file_message_length+END.length);
	for (var i = message.length-1; i>=0 ; i--) bin[i] = (message.charCodeAt(i) & 0xff);
	var offset=message.length;
	for(f in file_data)
	{
		for (var j = file_message[f].length-1; j>=0 ; j--) bin[j+offset] = (file_message[f].charCodeAt(j) & 0xff);
		offset+=file_message[f].length;
		bin.set(file_data[f].data,offset);
		offset+=file_data[f].data.length;
		for (var j = 1; j>=0 ; j--) bin[j+offset] = (CRLF.charCodeAt(j) & 0xff);
		offset+=2;
	}
	for (var i = END.length-1; i>=0 ; i--) bin[i+offset] = (END.charCodeAt(i) & 0xff);
	opn.progress.oneMoreToDo();
	file_request.send(bin);
	return p;
};

OPNAPI.prototype.getHttp=function(url,data,mime,responseType,withCredentials,timeout)
{
	var file_request=new XMLHttpRequest();
	var p=new opnPromise(file_request);
	p.catch(function(){
		console.log(p);
		console.log('E');
	});
	var msg="";
	if(typeof data!=='undefined')
	{
		var i=0;
		for(v in data)
		{
			if(i==0){msg="?"+v+"="+data[v];i+=1}
			else msg+="&"+v+"="+data[v];
		}
	}
	file_request.open("GET",url+msg,true);
	if(timeout)
	{
		file_request.timeout = 10000;
		file_request.ontimeout=function(){p.callCatch();};
	}
	file_request.onreadystatechange=function()
	{
		if (file_request.readyState==4)
		{
			if(file_request.status==200)
			{
				opn.progress.oneMoreDone();
				p.callThen();
			}
			else
			{
				opn.progress.oneMoreDone();
				p.callCatch();
			}
		}
	}
	if(mime) file_request.overrideMimeType(mime);
	else file_request.overrideMimeType("text/plain; charset=x-user-defined");
	if(responseType){file_request.responseType=responseType;}
	if(withCredentials)file_request.withCredentials=true;
	opn.progress.oneMoreToDo();
	file_request.send();
	return p;
};

/**
 * This method parses a URI string and returns an object with the variable parameters contained in the URI.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * var params=opn.getURIComponents('http://www.example.com/?a=1&b=2&c=3');<br>
 * //The variable "params" is an object with the parameters a,b,c and their values.<br></font>
 * @param url The URL to be parsed.
 * @return Object An object with the parsed parameters and their values.
 */
OPNAPI.prototype.getURIComponents=function(uri) {
	var qs=uri || document.location.search;
    qs = qs.split('+').join(' ');

    var params = {},
        tokens,
        re = /[?&]?([^=]+)=([^&]*)/g;

    while (tokens = re.exec(qs)) {
        params[decodeURIComponent(tokens[1])] = decodeURIComponent(tokens[2]);
    }
    return params;
};

/**
 * This method returns a promise object that will be triggered after a specific period of time.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * opn.wait({seconds:5}).then(function(){<br>
 * ...<br>
 * });<br></font>
 * @param options An object with one or more of the following fields: milliseconds, seconds, minutes.
 * @return opnPromise The promise object that is triggered with after this period of time.
 */
OPNAPI.prototype.wait=function(options)
{
	var t=0;
	if(options)
	{
		if(options.seconds)t+=options.seconds*1000;
		if(options.milliseconds)t+=options.milliseconds;
		if(options.minutes)t+=options.minutes*1000*60;
	}
	var p=new opnPromise();
	window.setTimeout(function(){p.callThen();},t);
	return p;
};

OPNAPI.prototype.whenConsoleLog=function(){
	var old=console.log;
	var p=new opnPromise().allowMultipleCalls(true);
	console.log=function(txt){
		if(typeof txt!=='undefined')p.callThen({object:txt});
		else p.callThen({object:'undefined'});
		old.apply(console,arguments);
	}
	this.whenConsoleLog=function(){return p;};
	return p;
}
 
OPNAPI.prototype.debug=function(method)
{
	var self=this;
	
	if(typeof method==='string')
	{
		if(typeof self._debug_w==='undefined')
		{
			self._debug_w=this.getWindowManager().createConsole();
			self._debug_w.setTitle('Debug console');
			self._debug_w.whenClosed().then(function(w){w.cancelClosing();w.hide();});
		}
		self._debug_w.show();
		self._debug_w.setSelected(true);
		self._debug_w.println(method);
		return;
	}
	
	var showError=function(err,prmt)
	{
		if(typeof self._debug_w==='undefined')
		{
			self._debug_w=opn.getWindowManager().createConsole();
			self._debug_w.setTitle('Debug console');
			self._debug_w.whenClosed().then(function(w){w.cancelClosing();w.hide();});
		}
		self._debug_w.show();
		self._debug_w.setSelected(true);
		self._debug_w.error(err,prmt);
	};
	
	if(typeof this.err_callback==='undefined')
	{
		this.err_callback=function(e) { 
			showError(e.message+" line:"+e.lineno+" column:"+e.colno,"Syntax Error");
			return true;
		};
		window.addEventListener('error',this.err_callback, false);
	}

	if(typeof method!=='undefined')
	this.wait().then(function()
	{
		try{method();}
		catch(e)
		{
			var s=''+e.stack;
			var i=s.indexOf('<anonymous>:');
			var line=-1;
			if(i!=-1)//chrome
			{
				line=parseInt(s.substring(i+12,s.indexOf(':',i+12)));
			}
			else
			{
				i=s.indexOf('eval:');
				if(i!=-1)//firefox
				{
					line=parseInt(s.substring(i+5,s.indexOf(':',i+5)));
				}
			}
			if(line>0)
			{
				showError(e.message+" line:"+line,"Run Time Error");
			}
			else
			{
				showError(e.message,"Run Time Error");
			}
		}
	});
};
 
/**
 * This class implements a progress counter that can be used to track the progress of multiple asynchronous processes such as the 
 * downloading of multiple files, or the uploading of a file to a server. It uses a simple API with two main methods "oneMoreToDo" and "oneMoreDone"
 * that update the status of the progress accordingly.
 */
function opnProgress(){
	this.pr_progress=new opnPromise(this).allowMultipleCalls(true);
	this.pr_done=new opnPromise(this);
	this.pr_onetodo=new opnPromise(this).allowMultipleCalls(true);
	this.pr_onedone=new opnPromise(this).allowMultipleCalls(true);
	this.reset();
}

opnProgress.prototype.reset=function(){
	this.max_value=0;
	this.value=0;
	this.last_time=0;
	this.start_time=0;
	this.inv_speed=-1;
};

opnProgress.prototype.copy=function(p){
	this.max_value=p.max_value;
	this.value=p.value;
	this.last_time=p.last_time;
	this.start_time=p.start_time;
	this.inv_speed=p.inv_speed;
}

opnProgress.prototype.resetAfter=function(milliseconds){
	this.reset_after=milliseconds;
};

/**
 * This method declares that there is one more job to be done, i.e. increases the "to do" list of the progress counter.
 * @param jobs An optional argument with the number of jobs you are setting (if more than one).
 */
opnProgress.prototype.oneMoreToDo=function(jobs)
{
	var n=jobs||1;
	if(this.pr_done.thenCalled)this.pr_done.reset();
	this.pr_onetodo.callThen({object:n});
	var now=new Date().getTime();
	if(this.start_time==0)
		this.start_time=now;
	
	if(this.reset_after && this.value==this.max_value && now-this.last_time>this.reset_after)
	{
		this.start_time=now;
		this.setProgress(0);
		this.setMaximumProgress(n);
	}
	else{
		this.setMaximumProgress(this.max_value+n);
	}
	this.last_time=now;
};

opnProgress.prototype.oneLessToDo=function(jobs)
{
	var n=jobs||1;
	//this.pr_onetodo.callThen({object:n});
	var now=new Date().getTime();	
	this.setMaximumProgress(this.max_value-n);
	this.last_time=now;
};

/**
 * This method declares that there is one more job done, i.e. increases the "done" list of the progress counter.
 * @param jobs An optional argument with the number of jobs you are setting (if more than one).
 */
opnProgress.prototype.oneMoreDone=function(jobs)
{
	var n=jobs||1;
	this.pr_onedone.callThen({object:n});
	this.setProgress(this.value+n);
	//this.last_time=new Date().getTime();
};

/**
 * This method declares that there is one less job done, i.e. decreases the "done" list of the progress counter.
 * @param jobs An optional argument with the number of jobs you are setting (if more than one).
 */
opnProgress.prototype.oneLessDone=function(jobs)
{
	var n=jobs||1;
	//this.pr_onedone.callThen({object:n});
	this.setProgress(this.value-n);
	//this.last_time=new Date().getTime();
};

/**
 * This method returns the percentage value that corresponds to a single job in the current job load.
 * @return number The current percentage value of 1 job in the range [0-1].
 */
opnProgress.prototype.getIncrement=function(){return 1/(this.max_value+1);};

/**
 * This method returns the current progress value.
 * @return number The progress value as a real number in the range [0-1].
 */
opnProgress.prototype.getValue=function(){return (this.value+1)/(this.max_value+1);};

/**
 * This method returns the approximate remaining time in seconds based on the current job load.
 * @return number The approximate remaining time in seconds or 0 if there is no estimation available.
 */
opnProgress.prototype.getRemainingTime=function(smooth_weight){
	if(this.start_time>0){
		var now=new Date().getTime();
		var dt=now-this.start_time;
		if(dt>0){
			if(this.value>0){
				var invspeed=(dt/1000)/this.value;
				if(this.inv_speed<0)
					this.inv_speed=invspeed;
				else {
					var w=0;
					if(typeof smooth_weight!=='undefined'){
						w=smooth_weight;
						if(w>=1)w=0.99;
						if(w<0)w=0;
					}
					this.inv_speed=this.inv_speed*w+(1-w)*invspeed;
				}
				return Math.round(this.inv_speed*(this.max_value-this.value));
			}else return 0;
		}else return 0;
	}
	else return 0;
};

opnProgress.prototype.setProgress=function(value)
 {
 	var v=value;
 	if(v>this.max_value) v=this.max_value;
 	else if(v<0)c=0;
 	if(v!=this.value)
 	{
 		this.value=v;
		this.pr_progress.callThen();
		if(this.value==this.max_value)
			this.pr_done.callThen();
 	}
 };
  
opnProgress.prototype.setMaximumProgress=function(value)
 {
	 
 	var v=value;
 	if(v<=0) return;
 	if(v!=this.max_value)
 	{
		
 		if(this.value>v) this.value=v;
 		this.max_value=v;
		this.pr_progress.callThen();
		if(this.value==this.max_value)
			this.pr_done.callThen();
 	}
 };
 
 /**
 * This method returns a promise that is triggered when there is one more todo.
 * @return opnPromise A promise object that is triggered with any change in the todo number. 
 */
 opnProgress.prototype.whenOneMoreToDo=function(){this.pr_onetodo.reset();return this.pr_onetodo};

 /**
 * This method returns a promise that is triggered when one more is done.
 * @return opnPromise A promise object that is triggered with any change in the done number. 
 */
 opnProgress.prototype.whenOneMoreDone=function(){this.pr_onedone.reset();return this.pr_onedone};
 
/**
 * This method returns a promise that is triggered when there has been a change in the progress value.
 * @return opnPromise A promise object that is triggered with any change in the progress value. 
 */
 opnProgress.prototype.whenProgress=function(){this.pr_progress.reset();return this.pr_progress};
 
/**
 * This method returns a promise that is triggered when the progress value goes to 1, i.e. when all jobs have been completed.
 * @return opnPromise A promise object that is triggered with any change in the progress value. 
 */
 opnProgress.prototype.whenDone=function(){return this.pr_done};

/** This class offers a convenient way to handle asynchronous processes by setting two callback functions "then" and "otherwise" that 
 * will be called when the particular asynchronous process successfully finishes or fails respectively.
 * <br><br><b>Example:</b><br><font style="font-family:Courier">
 * var promise=opn.import("my_library.js");<br>
 * promise.then(function(){<br>
 * ...<br>
 * }).otherwise(function(){<br>
 * ...<br>
 * });<br></font>
 * @param Object An optional object that will be provided as input argument to the "then" or "catch" callback functions.
 */
 function opnPromise(object)
{
	this.object=object;
	this.event=null;
	this.do_not_call_twice=false;
	this.thenCallback=[];
	this.catchCallback=[];
	this.abortCallback=[];
	this.thenCalled=false;
	this.catchCalled=false;
	this.abortCalled=false;
	this.allow_recursion=false;//to call a callback from inside the callback using callThen() inside the callback
}

/**
 * With this method you can set if a callback can be called more than one times, or if it should be removed after its first call. The default value is true. 
 * @param flag A Boolean value that corresponds to the desired behaviour of the promise.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.allowMultipleCalls=function(flag)
{
	this.do_not_call_twice=!flag;
	return this;
};
/**
 * With this method you can set if a callback can be called from inside the callback using callThen(). The default value is false. When set to true, the programer should be careful not to cause an infinite loop due to recursion.
 * @param flag A Boolean value that corresponds to the desired behaviour of the promise.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.allowRecursion=function(flag)
{
	this.allow_recursion=flag;
	return this;
};
/**
 * This method sets the object to be provided as input argument to the "then" or "catch" callback functions.
 * @param Object An object that will be provided as input argument to the "then" or "catch" callback functions.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.setObject=function(object)
{
	this.object=object;
	return this;
};

/**
 * This method sets the system event object associated with the current call of "then" or "catch" callback functions.
 * @param event The system event object associated with the current call of "then" or "catch" callback functions.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.setEvent=function(event)
{
	this.event=event;
	return this;
};

opnPromise.prototype.callAll=function(cb)
{
	var c=cb.slice();//copy the callback array in order to avoid calling new callbacks that will be added from inside the callbacks, i.e. if a callback contains reference to the method then(...) of the same promise.
	//console.log('Call All:'+c.length);
	for(var i=0;i<c.length;i++)
	{
		this.call(cb,c[i]);
	}
};

opnPromise.prototype.call=function(cb,c)
{
	if(!this.allow_recursion)
	{
		var ind=cb.indexOf(c);
		if(ind>-1)cb.splice(ind,1);//remove it from the cb array 
		//Note that it is removed before it is called, so that we avoid an infinite loop due to recursion in the case that the callback containes reference to the method then(...) of the same promise.
	}
	if(c(this.object,this.event,this)||this.do_not_call_twice){
		if(this.allow_recursion)
		{
			var ind=cb.indexOf(c);
			if(ind>-1)cb.splice(ind,1);//remove it from the cb array 
		}
	}//if returns true, this callback is not called anymore.
	else
	{
		if(!this.allow_recursion)cb.push(c);//put it back in the cb array if it returns true.
	}
};

/**
 * This method calls all "then" callbacks that have been set to this promise using the method "then". You can use 
 * this function when an asynchronous process is successfully completed.
 * @param options An optional object with one or more of the following fields: event (the corresponding system event object if any), object (an input object to be provided to the calls of then).
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.callThen=function(options)
{
	this.thenCalled=true;
	if(options&&typeof options.object!=='undefined')this.setObject(options.object);
	if(options&&options.event)this.setEvent(options.event);
	this.callAll(this.thenCallback);
	
	return this;
};

/**
 * This method calls all "catch" callbacks that have been set to this promise using the method "catch". You can use 
 * this function when an asynchronous process fails.
 * @param options An optional object with one or more of the following fields: event (the corresponding system event object if any), object (an input object to be provided to the calls of catch).
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.callOtherwise=function(options)
{
	this.catchCalled=true;
	if(options&&options.object)this.setObject(options.object);
	if(options&&options.event)this.setEvent(options.event);
	this.callAll(this.catchCallback);
	
	return this;
};

opnPromise.prototype.callCatch=opnPromise.prototype.callOtherwise;

/**
 * This method can be used to abort the corresponding asynchronous process. This method calls all "ifAborted" callbacks that have been set to this promise. 
 * @param options An optional object with one or more of the following fields: event (the corresponding system event object if any), object (an input object to be provided to the calls of then).
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.abort=function(options)
{
	this.abortCalled=true;
	if(options&&typeof options.object!=='undefined')this.setObject(options.object);
	if(options&&options.event)this.setEvent(options.event);
	this.callAll(this.abortCallback);
	
	return this;
};

/**
 * This method method resets the promise so that new callbacks will not be called for previously triggered then or catch.
 * You can use this function right after the methods callThen or callCatch.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.reset=function()
{
	this.catchCalled=false;
	this.thenCalled=false;
	this.abortCalled=false;
	
	return this;
};

/**
 * This method removes all callback functions associated with this promise object.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.clear=function()
{
	this.thenCallback=[];
	this.catchCallback=[];
	this.abortCallback=[];
	return this;
};

/**
 * With this method you can set a function that will be called when an asynchronous process is succesfully completed. The provided callback function when called may be provided with 2 input arguments, an object and an event.
 * The callback can be called multiple times if this is the nature of the process, e.g. whenProgress().then(function(object,event){...}). If you want to stop a callback
 * from being called again in the future, the callback must return true.
 * @param callback A function to be called when this promise is successfully fulfilled.
 * @return opnPromise The same promise object is returned in order to define an "otherwise" callback function after defining a "then" callback.
 */
opnPromise.prototype.then=function(callback)
{
	this.thenCallback.push(callback);
	if(this.thenCalled)
		this.call(this.thenCallback,callback);

	return this;
};

/**
 * With this method you can set a function that will be called when an asynchronous process fails. The provided callback function when called may be provided with 2 input arguments, an object and an event.
 * The callback can be called multiple times if this is the nature of the process. If you want to stop a callback
 * from being called again in the future, the callback must return true.
 * @param callback A function to be called when this promise is unsuccessfully fulfilled (cancelled).
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.otherwise=function(callback)
{
	this.catchCallback.push(callback);
	if(this.catchCalled)
		this.call(this.catchCallback,callback);
	
	return this;
};
opnPromise.prototype.catch=opnPromise.prototype.otherwise;
 
/**
 * With this method you can set a function that will be called when an asynchronous process is aborted. The provided callback function when called may be provided with 2 input arguments, an object and an event.
 * The callback can be called multiple times if this is the nature of the process. If you want to stop a callback
 * from being called again in the future, the callback must return true.
 * @param callback A function to be called when this promise is aborted.
 * @return opnPromise The same promise object is returned in order to chain the call of multiple methods.
 */
opnPromise.prototype.ifAborted=function(callback)
{
	this.abortCallback.push(callback);
	if(this.abortCalled)
		this.call(this.abortCallback,callback);
	
	return this;
};

opnPromise.prototype.getProgress=function(){
	if(this._progress)return this._progress;
	this._progress=new opnProgress();
	return this._progress;
};

opnPromise.prototype.whenProgress=function(){return this.getProgress().whenProgress();};

opnPromise.implementWhen=function(whenname,classname,options){
	classname.prototype["when"+whenname]=function(){
		var p=new opnPromise(this);
		if(options && options.callMultipleTimes)p.callMultipleTimes(true);
		this["when"+whenname]=function(){return p;};
		return p;
	}
}

function opnCache(app,caller)
{
	this.app=app;
	var ids={};
	this.get=(id)=>{
		var o=ids[id];
		if(o)return o;
		else if(caller) return caller.cache.get(id);
		else return null;
	}
	this.set=(id,o)=>{
		//console.log("Caching: "+id);
		ids[id]=o;
		if(caller) caller.cache.set(id,o);
	};
}

opnCache.prototype.load=function(id){
	var o=this.get(id);
	if(o)return o.p;
	else{
		//console.log(this.app.name+" downloading "+id)
		var o={};
		var app=new opnApp({caller:this.app});
		o.p=app.load(id);
		o.p.then((data)=>{
				o.data=data;
			});
		this.set(id,o);
		return o.p;
	}
}

function opnApp(options)
{
	//console.log(options);
	var opt=options||{};
	this._run_p=new opnPromise(this);
	this._error_p=new opnPromise(this);
	this._terminate_p=new opnPromise(this);
	this._progress=new opnProgress();
	this._id=null;
	this.assets={};
	if(opt.disableCache)this.cache=new opnCache(this);
	else this.cache=new opnCache(this,opt.caller);
	if(opt.caller)
	{
		this._progress.whenOneMoreToDo().then((n)=>{
			if(!opt.caller.isTerminated())
			opt.caller.getProgress().oneMoreToDo(n);
			});
		this._progress.whenOneMoreDone().then((n)=>{
			if(!opt.caller.isTerminated())
			opt.caller.getProgress().oneMoreDone(n);
			});
	}
}

opnApp.prototype.getId=function()
{
	return this._id;
};
opnApp.prototype.setId=function(id)
{
	this._id=id;
};

opnApp.prototype.setContentDiv=function(div)
{
	this.content_div=div;
};

opnApp.prototype.getContentDiv=function()
{
	if(this.content_div)return this.content_div;
	else if(this.window)return this.window.getContentDiv();
	else 
	{
		var w=this.getWindow();
		if(w) return w.getContentDiv();
		else {
			this.setContentDiv(opn.getScreen());
			return this.content_div;
		}
	}
};

opnApp.prototype.showLoading=function()
{
	this.clearContents();
	opn.showProgress({div:this.getContentDiv(),progress:this.getProgress()});
};

opnApp.prototype.clearContents=function()
{
	var div=this.getContentDiv();
	while(div.firstChild)div.removeChild(div.firstChild);
};

opnApp.prototype.setWindow=function(w)
{
	this.window=w;
	var self=this;
	this.window.whenDestroyed().then(()=>{
		self.terminate();
	});
};

opnApp.prototype.getWindow=function()
{
	if(this.window)return this.window;
	else 
	{
		if(opn.getWindowManager()){
			this.window=opn.getWindowManager().createWindow();
			if(this.content_div)
			{
				this.window.hide();
				var self=this;
				this.window.getContentDiv=function(){return self.content_div;};
			}
			else
			{
				var self=this;
				this.window.whenDestroyed().then(function(){
					self.terminate();
				});
		
				if(this.cloudObject&&this.cloudObject.info&&this.cloudObject.getSystemProperty('NAME'))
					this.window.setTitle(this.cloudObject.getSystemProperty('NAME'));
			}
			return this.window;
		}else return null;
	}
};

opnApp.prototype.isWindowed=function()
{
	if(this.content_div)return false;
	else return true;
};

opnApp.prototype.getProgress=function(){
	return this._progress;
	};

opnApp.codifyAssets=function(AssetsString)
{
	var out='var __Asset='+AssetsString+';';
	if(typeof AssetsString==='undefined')out='var __Asset={};';
	
	out+='var AssetID=function(a){if(typeof __Asset[a]=="undefined")throw new Error("Unknown Asset: "+a);return __Asset[a].id};';
	out+='var AssetType=function(a){if(typeof __Asset[a]=="undefined")throw new Error("Unknown Asset: "+a);return __Asset[a].type};';
	out+='var loadImage=function(a){if(typeof __Asset[a]=="undefined")throw new Error("Unknown Asset: "+a);return opn.load({id:AssetID(a),type:"url"});};';
	out+='var loadTexture=function(a,c){if(typeof __Asset[a]=="undefined")throw new Error("Unknown Asset: "+a);var t=new GLTexture(c); opn.load({id:AssetID(a),type:"url"}).then(function(url){t.load(url)});return t;};';
	out+='var loadObject=function(a,c){if(typeof __Asset[a]=="undefined")throw new Error("Unknown Asset: "+a);var o=new GLObject(c);o.load(AssetID(a)).then(function(){o.setShader(new GLShader(c,{map:true,uv:true,diffuse:true,specular:true}))});return o;};';
	out+='var imageAsset=loadImage;';
	
	out+='var loadAsset=function(a,op){if(typeof __Asset[a]=="undefined"){if(a.indexOf(".js")==a.length-3||a.indexOf("https://")==0||a.indexOf("http://")==0||a.indexOf("/")==0||a.indexOf("../")==0){var o=op||{};return opn.load({id:a,type:"app"},{progress:o.progress});}else if(a.indexOf("app:")==0){var o=op||{};return opn.load({id:a.substring(4),type:"app"},{progress:o.progress});}else throw new Error("Unknown Asset: "+a);}var o=op||{};';
	out+='if(__Asset[a].type=="Image" && typeof o.type=="undefined")return opn.load({id:__Asset[a].id,type:"url"},{progress:o.progress});';
	out+='else if(__Asset[a].type=="SVG" && typeof o.type=="undefined")return opn.load({id:__Asset[a].id,type:"url",mime:"image/svg+xml"},{progress:o.progress});';
	out+='else if(__Asset[a].type=="Audio" && typeof o.type=="undefined")return opn.load({id:__Asset[a].id,type:"url",mime:"audio/mpeg"},{progress:o.progress});';
	out+='else if((__Asset[a].type=="App" || __Asset[a].type=="AppData") && typeof o.type=="undefined")return opn.load({id:__Asset[a].id,type:"app"},{progress:o.progress});';
	out+='else if(typeof o.type=="undefined") return opn.load({id:__Asset[a].id,type:"url"},{progress:o.progress});';
	out+='else return opn.load({id:__Asset[a].id,type:o.type},{progress:o.progress});};';
	
	out+='var loadAssets=function(A,op){var o=op||{};var d=[];for(var i in A){var a=A[i];';
	out+='if(typeof __Asset[a]=="undefined"){if(a.indexOf(".js")==a.length-3||a.indexOf("https://")==0||a.indexOf("http://")==0||a.indexOf("/")==0||a.indexOf("../")==0){d.push({id:a,type:"app"});}else if(a.indexOf("app:")==0){d.push({id:a.substring(4),type:"app"});}else throw new Error("Unknown Asset: "+a);}';
	out+='else if(__Asset[a].type=="Image"&&(typeof o.only=="undefined"||o.only=="Image"))d.push({id:__Asset[a].id,type:"url",name:a});';
	out+='else if(__Asset[a].type=="SVG"&&(typeof o.only=="undefined"||o.only=="Image"))d.push({id:__Asset[a].id,type:"url",name:a,mime:"image/svg+xml"});';
	out+='else if(__Asset[a].type=="Audio"&&(typeof o.only=="undefined"||o.only=="Audio"))d.push({id:__Asset[a].id,type:"url",name:a,mime:"audio/mpeg"});';
	out+='else if((__Asset[a].type=="App"||__Asset[a].type=="AppData")&&(typeof o.only=="undefined"||o.only=="App"||o.only=="Code"))d.push({id:__Asset[a].id,type:"app"});';
	out+='else if(typeof o.only=="undefined")d.push({id:__Asset[a].id,type:"url",name:a});';
	out+='}return opn.load(d,{progress:o.progress});};';
	
	out+='var loadAllAssets=function(op){var o=op||{};var d=[];for(var a in __Asset)';
	out+='if(typeof __Asset[a]=="undefined"&&(typeof o.in=="undefined"||a.indexOf(o.in)==0)){if(a.indexOf(".js")==a.length-3||a.indexOf("https://")==0||a.indexOf("http://")==0||a.indexOf("/")==0||a.indexOf("../")==0){d.push({id:a,type:"app"});}else throw new Error("Unknown Asset: "+a);}';
	out+='else if(__Asset[a].type=="Image"&&(typeof o.only=="undefined"||o.only=="Image")&&(typeof o.in=="undefined"||a.indexOf(o.in)==0))d.push({id:__Asset[a].id,type:"url",name:a});';
	out+='else if(__Asset[a].type=="SVG"&&(typeof o.only=="undefined"||o.only=="Image")&&(typeof o.in=="undefined"||a.indexOf(o.in)==0))d.push({id:__Asset[a].id,type:"url",name:a,mime:"image/svg+xml"});';
	out+='else if(__Asset[a].type=="Audio"&&(typeof o.only=="undefined"||o.only=="Audio")&&(typeof o.in=="undefined"||a.indexOf(o.in)==0))d.push({id:__Asset[a].id,type:"url",name:a,mime:"audio/mpeg"});';
	out+='else if((__Asset[a].type=="App"||__Asset[a].type=="AppData")&&(typeof o.only=="undefined"||o.only=="App"||o.only=="Code")&&(typeof o.in=="undefined"||a.indexOf(o.in)==0))d.push({id:__Asset[a].id,type:"app"});';
	out+='else if(__Asset[a].type=="List"){}';
	out+='else if(typeof o.only=="undefined" &&(typeof o.in=="undefined"||a.indexOf(o.in)==0))d.push({id:__Asset[a].id,type:"url",name:a});';
	out+='return opn.load(d,{progress:o.progress});};';
	return out;
};

opnApp.prototype.load=function(id,options)
{
	var self=this;
	
	//if oid ends with .js or starts with http:// or https:// or / or ..
	if(id.indexOf(".js")==id.length-3||id.indexOf("https://")==0||id.indexOf("http://")==0||id.indexOf("/")==0||id.indexOf("../")==0)
	{
		//console.log("Loading "+id);
		opn.http(id,{responseType:"text",mime:"application/javascript; charset=UTF-8"}).then(function(request){
			var app=id.lastIndexOf("/");
			if(app>-1)app=id.substring(app+1);else app=id;
			console.log("Running "+app);
			app=self.pack({id:id,assets:"{}",code:request.response});
			opn.wait().then(function()
			{
				self.run(app,options);
			});
			
		});
		return this.whenStarted();
	}
	
	this.cloudObject=opn.cloud.getObject(id);
	this.cloudObject.whenReady().then(function(o){
		self.setId(o.id);
		//The asset IDs must be updated if the object is mirrored or just cloned from mirror
		var hst=o.id.hostname;
		if(typeof o.getSystemProperty('EVOLVED_VERSION')!=='undefined' && o.getSystemProperty('EVOLVED_VERSION')==o.getSystemProperty('VERSION')){
			var aid=new opnCloudObjectID(o.getSystemProperty('CLONED_FROM_OID'));
			hst=aid.hostname;
		}
		
		if(o.info.Assets && hst!=null){
			var a=JSON.parse(o.info.Assets);
			for(var i in a){
				var aid=new opnCloudObjectID(a[i].id);
				if(aid.hostname==null){
					aid.setHostname(hst);
					a[i].id=aid.toString();
				}
			}
			o.info.Assets=JSON.stringify(a);
		}
		o.download({type:'string'}).then(function(data,request){
			console.log("Running "+o.getSystemProperty('NAME'));
			var app=self.pack({id:o.id.toString(),assets:o.info.Assets,code:data});
			opn.wait().then(function()
			{
				self.run(app,options);
			});
		});
	}).otherwise(()=>{
		this.whenStarted().callOtherwise();
	});
	return this.whenStarted();
};

opnApp.prototype.getUserData=function(options)
{
	var opt=options||{};
	var p=new opnPromise();
	var started=false;
	var self=this;
	var me=opn.cloud.getMe();
	var getD=function(){
		var user_data=me.getAppDataInstalled(self.getId());
		user_data.whenReady().then(function(){
			if(started)return;
			started=true;
			p.callThen({object:user_data});
		});
	};
	me.whenReady().then(function(){
		getD();
	}).catch(function(){
		if(opt.mustLogin) opn.cloud.getMe().login();
		else {
			if(started)return;
			started=true;
			p.callThen({object:null});
		}
	});

	me.whenLogin().then(function(){
		getD();
	});
	
	return p;
};

opnApp.getPackedCode=function(id,assets,code,preloaded){
	var start="(function(_opn_inp,opn,window,opnApp,main,app,str,opt,options){\"use strict\";";
		
	if(typeof preloaded!=="undefined"){
		var preload="var preload=function(){var p=new opnPromise();p.before=function(){return p;};p.callThen({object:_opn_inp.assets});return p;};var exportData=function(r){_opn_inp.app.whenStarted().callThen({object:r});};";
		return start+preloaded+"var OPN_OID=\""+id+"\";var VN_OID=OPN_OID;"+preload+assets+code+"\nmain(_opn_inp);})";
	}else{
		var preload="var _prl_str=[];var preload=function(o,c){if(o&&typeof o==\"string\")_prl_str.push(o);else if(o&& o instanceof Array){for(var i=0;i<o.length;i++)_prl_str.push(o[i]);}var p=new opnPromise();p.before=function(f){f(_opn_inp);return p;};return p;};"
		return start+"var OPN_OID=\""+id+"\";var VN_OID=OPN_OID;"+preload+assets+code+"\nvar __p=new opnPromise();if(_prl_str&& _prl_str instanceof Array){ __p=loadAssets(_prl_str);}else {__p.callThen();}return __p;})";
	}
}

//not in prototype
opnApp.prototype.pack=function(options)
{
	var opt=options||{};
	var i=opt.code.indexOf("VN_");
	if(i>=0){
		console.log(opt.id+" "+opt.code.substring(Math.max(0,i-10),Math.max(0,i-10)+50));
	}
	//defines preload, calls preload.before(),preloads assets,does not call main
	var app= eval(opnApp.getPackedCode(opt.id,opnApp.codifyAssets(opt.assets),opt.code));
	
	return function(_opn_inp,opn,window,opnApp){
		var p=app(_opn_inp,opn,window,opnApp);
		var f=function(assets){
				var p=null;
				var f=null;
				var str="";
				if(assets){
					opn.set(_opn_inp.app.assets,assets);
					assets=null;
				}
				
				for(var i in _opn_inp.app.assets){
						str+="var "+i+"=_opn_inp.app.assets[\""+i+"\"];";
					}
				i=null;
				//calls preload.then(), defines exportData, calls main
				var app= eval(opnApp.getPackedCode(opt.id,opnApp.codifyAssets(opt.assets),opt.code,str));
				app(_opn_inp,opn,window,opnApp);
		};
		if(p&&p.then&&typeof p.then=="function")p.then(f);
		else f();
		
	};
};

opnApp.prototype.run=function(app,options)
{
	var self=this;
	var opt=options||{};
	opt.api=this;
	opt.app=this;
				
	//copies the opn object
	var newopn={};
	opn.set(newopn,opn);
	//overriding...
	newopn.load=function(input,options){var op=options||{};op.caller=self;return opn.load(input,op);};
	
	//copies the window object
	var newwindow={};
	var p=Object.getOwnPropertyNames(window);
	for(var i in p)
	{
		newwindow[p[i]]=window[p[i]];
		if(typeof window[p[i]]=='function')
		{
			newwindow[p[i]]=(function(name){return function(a,b,c,d,e,f,g,h,i,j,k,l,m,n,o){return window[name](a,b,c,d,e,f,g,h,i,j,k,l,m,n,o);};})(p[i]);
		}
	}
	if(newwindow.window)delete newwindow.window;
	
	//copies the opnApp class
	var opnApp_=function(c){var cc=c||{};if(cc.caller){}else cc.caller=self;opnApp.call(this,cc);};
	opn.extend(opnApp,opnApp_);
	opnApp_.codifyAssets=opnApp.codifyAssets;
	//opnApp_.pack=opnApp.pack;
	opnApp_.getPackedCode=opnApp.getPackedCode;
	
	if(opt.catchErrors)
	{
		try
		{
			app(opt,newopn,newwindow,opnApp_);}
		catch(e){self.whenStarted().callThen();throw(e);}
	}
	else app(opt,newopn,newwindow,opnApp_);
};

opnApp.prototype.whenStarted=function(){return this._run_p;};
opnApp.prototype.whenError=function(){return this._error_p;};
opnApp.prototype.whenTerminated=function(){return this._terminate_p;};
opnApp.prototype.isTerminated=function(){if(this._terminate_p)return false;else return true;}
opnApp.prototype.terminate=function(){
	if(this._terminate_p){//so that we do not terminate twice
		this._terminate_p.callThen();
		delete this._run_p;
		delete this._error_p;
		delete this._terminate_p;
		delete this._progress;
		delete this._id;
		delete this.assets;
	}
};

var opn=opn||new OPNAPI();
opn.App=opnApp;
opn.Promise=opnPromise;
opn.Progress=opnProgress;
opn.set(window,{opn,opnApp,opnPromise,opnProgress,VNApp:opnApp,VNPromise:opnPromise,VNProgress:opnProgress,vn:opn});
})(window);