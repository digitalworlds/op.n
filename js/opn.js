var opn={
		run:function(app,options){
			opn=null;
			
			var scripts = document.getElementsByTagName('script');
			var url='';
			for(var i in scripts){
				if(scripts[i].src){
				 var ind=scripts[i].src.indexOf('/js/opn.js');
				 if(ind>0)url=scripts[i].src.substring(0,ind+1);
				}
			}
			
			
			let h = new XMLHttpRequest();
     	 	h.onreadystatechange = function(){
				if (h.readyState === XMLHttpRequest.DONE) {
        			if (h.status === 200) {
         			 let j=JSON.parse(h.responseText);
         			 let version=j.version;
         			 
         			 
         			 var s,r,t;
					  r = false;
					  s = document.createElement('script');
					  s.type = 'text/javascript';
					  s.onerror= function(){console.log('Error loading op.n core.')};
					  s.onload = s.onreadystatechange = function() {
						if ( !r && (!document.readyState || document.readyState == 'complete' || document.readyState == 'loaded') )
					    {
					      r = true;
					      opn.run(app,options);
					    }
					  };
					  s.src =url+'js/opn-'+version+'.js';
					  console.log('Running op.n v'+version);
					  t = document.getElementsByTagName('script')[0];
					  t.parentNode.insertBefore(s, t);
         			 
         			 
       			 } else {
         			 console.log('Error');
       		 	 }
      			}
			};
      		h.open("GET", url+'do/settings.json?'+new Date().getTime());
      		h.send();
			
			
		}
}