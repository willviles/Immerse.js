// Asset Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ){

  var ImmerseAssetController = function() {};

  ImmerseAssetController.prototype = {

    // Register Assets
    ///////////////////////////////////////////////////////

    register: function(imm) {

      // Get a handle on the Immerse object
      this.imm = imm;

      var assetQueueLoaded = jQuery.Deferred(),
          assetQueue = [],
          assetLoadingFailed,
          assetQueueCheck = function() {
            if (assetQueue.length === 0) { assetQueueLoaded.resolve('loaded'); clearTimeout(assetLoadingFailed); }
          }
          that = this;

      $.each(this.imm._assets, function(n, a) {

        if (a.type === 'audio') { that.addToDOM.audio.call(that, n, a); }
        if (a.type === 'video') { that.addToDOM.video.call(that, n, a); }

        // If set to wait, push into queue
        if (a.wait === true) {
          // Catch any error in instantiating asset
          if (a.error) { console.log("Asset Failure: Could not preload " + a.type + " asset '" + n + "'"); return; }
          assetQueue.push({name: n, asset: a});
        }

      });

      $.each(assetQueue, function(i, a) {

        var n = a.name,
            a = a.asset;

        // Check if connection is fast enough to load audio/video
        if (a.type === 'audio' || a.type === 'video') {
          $(a.type + '#' + n)[0].addEventListener('canplaythrough', function() {
            assetQueue.splice( $.inArray(a, assetQueue), 1 );
            assetQueueCheck();
          }, false);
        }

        // Load the image asset
        if (a.type === 'image') {
          var fileTypes = ($.isArray(a.fileTypes)) ? a.fileTypes : ['jpg'],
              imagesLoadComplete = jQuery.Deferred(),
              imagesLoadCheck = function() {
                if (fileTypes.length === 0) { imagesLoadComplete.resolve('loaded'); }
              };

          $.each(fileTypes, function(i, ft) {
            var tmp = new Image();
            tmp.src = a.path + '.' + ft;
            tmp.onload = function() {
              fileTypes.splice( $.inArray(ft, fileTypes), 1 );
              imagesLoadCheck();
            };
          });

          imagesLoadComplete.done(function() {
            assetQueue.splice( $.inArray(a, assetQueue), 1 );
            assetQueueCheck();
          });
        }
      });

      // If no assets are queued, make sure function fires
      assetQueueCheck();

      // Reject after a random interval
      assetLoadingFailed = setTimeout(function() {
        assetQueueLoaded.reject('problem');
      }, 10000);


      return assetQueueLoaded.promise();
    },

    // Add Assets to DOM
    ///////////////////////////////////////////////////////

    addToDOM: {

      // Audio
      audio: function(n, a) {

        if (a.path === undefined ) { console.log("Asset Error: Must define a path for audio asset '" + n + "'"); a.error = true; return false };

        var l = a.loop == true ? 'loop' : '',
            fileTypes = ($.isArray(a.fileTypes)) ? a.fileTypes : ['mp3'],
            sourceStr = '';

        $.each(fileTypes, function(i, ft) {
          sourceStr = sourceStr + '<source src="' + a.path + '.' + ft +'" type="audio/' + ft + '">';
        });

        this.imm.$elem.append('<audio id="' + n + '" class="imm-audio" ' + l + '>' + sourceStr + '</audio>');
        this.imm._allAudio.push(n);
        return true;
      },

      // Video
      video: function(n, o) {

        if (o.path === undefined ) { console.log("Asset Error: Must define a path for video asset '" + n + "'"); o.error = true; return false };

        var $wrapper = this.imm.$elem.find('[data-imm-video="' + n + '"]'),
            fileTypes = ($.isArray(o.fileTypes)) ? o.fileTypes : ['mp4', 'ogv', 'webm'],
            loop = (o.loop === false) ? '' : 'loop="loop" ',
            sourceStr = '';

        $wrapper.css('background-image', 'url(' + o.path + '.jpg)');

        // If we're on a mobile device, don't append video tags
        if (this._isMobile) { return false; }

        $.each(fileTypes, function(i, ft) {
          sourceStr = sourceStr + '<source src="' + o.path + '.' + ft +'" type="video/' + ft + '">';
        });

        var $v = $('<video ' + loop + '>' + sourceStr + '</video>');

        $wrapper.append($v);
      }
    },

    // Track Loading
    ///////////////////////////////////////////////////////

    loading: function(imm) {

      this.imm = imm;

      $.when(this.imm._assetQueue).then(
        function(s) {
          // Run init on all sections
          $.each(that.imm._sections, function(i, s) {
            $(s.element).trigger('init');
          });

          that.imm.$elem.trigger('immInit');

          // Hide loading
          // TODO: Allow for custom loading animation sequences. Consider how to introduce a percentage bar
          $('.imm-loading').hide();

        },
        function(s) {
          alert('Asset loading failed');
        }
      );

    }

  }; // End of all plugin functions

  // Functions to expose to rest of the plugin
  $.Immerse.assetController = {
    register: function(imm) {
      return new ImmerseAssetController(this).register(imm);
    },

    loading: function(imm) {
      return new ImmerseAssetController(this).loading(imm);
    }
  }

})( jQuery, window , document );