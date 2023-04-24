var opn={
		run:function(app,options){
			opn=null;
			var default_version="1.20";
			
			var scripts = document.getElementsByTagName('script');
			var url='';
			for(var i in scripts){
				if(scripts[i].src){
				 var ind=scripts[i].src.indexOf('/js/opn.js');
				 if(ind>0)url=scripts[i].src.substring(0,ind+1);
				}
			}
			
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
		  s.src =url+'js/opn-'+default_version+'.js';
		  console.log('Running op.n v'+default_version);
		  t = document.getElementsByTagName('script')[0];
		  t.parentNode.insertBefore(s, t);
		}
}