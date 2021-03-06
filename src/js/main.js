/*
Script Name: Immerse.js
Description: Build immersive, media driven web experiences the easy way
Version: 1.0.27
Author: Will Viles
Author URI: http://vil.es/
*/

// Global Plugin Constructor
var Immerse = function() {};

(function( $, window, document, undefined ){

  // Plugin Prototype
  Immerse.prototype = {

    // Setup
    ///////////////////////////////////////////////////////

    setup: function(setup) {

      this.defaults = {
        options: {
          // Set a default for the section selector
          namespace: 'imm',
          // Set breakpoints
          breakpoints: {
            mobile: 480,
            tablet: 768,
            mdDesktop: 992,
            lgDesktop: 1200
          },
          muteButton: {
            unmuted: 'Audio On',
            muted: 'Audio Off',
          },
          scroll: {
            duration: 1,
            easing: Power4.easeOut
          },
          hashChange: true,
          devMode: false
        },
        sections: []
      };

      this.setup = $.extend(true, {}, this.defaults, setup);

      return this;
    },

    // Initialize
    ///////////////////////////////////////////////////////

    init: function() {

      // Set the page
      var pageNamespace = this.utils.namespacify.call(this, 'page'),
          pageDataTag = typeof this.setup.pageName === 'string' ?
                        this.utils.datatagify.call(this, pageNamespace, this.setup.pageName) :
                        this.utils.datatagify.call(this, pageNamespace);

      this.$page = $(pageDataTag);
      if (this.$page.length === 0) {
        this.utils.log('No page container defined. Page load failed.');
        return false;
      }

      this._assets = this.setup.assets;
      this._sections = [];
      this._isInitialized = false;
      this._isScrolling = false;
      this._canScroll = true;
      this._allAudio = [];

      var that = this;

      // Setup the Viewport Controller
      $.Immerse.viewportController.init(this);
      // Setup the Asset Queue
      this._assetQueue = $.Immerse.assetController.register(this);
      // Setup the Section Controller
      $.Immerse.sectionController.init(this);
      // Setup the State Controller
      $.Immerse.stateController.init(this);
      // Setup the Focus Controller
      $.Immerse.focusController.init(this);
      // Setup the Scroll Controller
      $.Immerse.scrollController.init(this);
      // Setup the Navigation Controller
      $.Immerse.navigationController.init(this);
      // Setup the Audio Controller
      $.Immerse.audioController.init(this);
      // Ensure immInit is called when assets are loaded
      $.Immerse.assetController.loading(this);

      return this;
    },

    // Utilities
    ///////////////////////////////////////////////////////

    utils: {

      cssAnimationEvents: 'webkitAnimationEnd oanimationend msAnimationEnd animationend',

      stringify: function(str) {
        return str.replace(/[-_]/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().replace(/\b[a-z]/g, function(letter) {
          return letter.toUpperCase();
        });
      },

      namespacify: function() {
        var namespacedString = this.setup.options.namespace;

        for (var i = 0; i < arguments.length; ++i) {
          namespacedString += '-' + arguments[i];
        }

        return namespacedString;
      },

      datatagify: function(str, val) {

        if (val === undefined) {
          return '[data-' + str + ']';
        } else {
          return '[data-' + str + '="' + val + '"]';
        }
      },

      sectionify: function(id) {
        var ns = this.utils.namespacify.call(this, 'section');
        return (id !== undefined) ? this.utils.datatagify(ns, id) : this.utils.datatagify(ns);
      },

      cookies: {
        set: function(name, value, expiresInSeconds) {
          var r = new Date;
          r.setTime(r.getTime() + expiresInSeconds * 24 * 60 * 60 * 1e3);
          var i = "expires=" + r.toGMTString();
          document.cookie = name + "=" + value + "; " + i

        },

        get: function(e) {
          var t = e + "=",
              n = document.cookie.split(";");
          for (var r = 0; r < n.length; r++) {
              var i = n[r];
              while (i.charAt(0) == " ") i = i.substring(1);
              if (i.indexOf(t) != -1) return i.substring(t.length, i.length)
          }
          return ""
        },

        delete: function(e) {
          this.utils.cookies.set.call(this, e, '', -1);
        }

      },

      log: function(imm, thingToLog) {
        if (imm.setup.options.devMode === true) {
          console.log('Immerse.js | ' + thingToLog);
        }
      }
    },

    // API Endpoints
    ///////////////////////////////////////////////////////

    // Description: Add a section to a page
    section: function(id, section) {
      return $.Immerse.sectionController.add(this, id, section);
    },

    kill: function() {


      this.$page.off('immInit sectionChanged'); // Kill all events attached to Immerse init event or sectionChanged
      $.Immerse.sectionController.kill(this); // Kill all events attached to section controller
      $.Immerse.audioController.kill(this); // Kill all audio
      $.Immerse.focusController.kill(); // Return focus to body
      $.Immerse.viewportController.kill(); // Unbind all viewport listeners
      $.Immerse.scrollController.kill(this); // Unbind all scroll events and return to normal scroll

      // If deleted successfully, log the fact it has.
      this.utils.log(this, 'Immerse instance successfully deleted.');

      return true;
    },

    // Description: Register a new component with Immerse
    component: function(opts) {
      return $.Immerse.componentController.add(opts);
    },

    // Description: Get state of audio & mute/unmute programmatically
    audio: function(status) {
      if (status === undefined) {
        return this._muted ? false : true;
      } else {
        $.Immerse.audioController.changeStatus(this, status);
      }
    },

    // Description: Allow for changing section programmatically
    changeSection: function(goVar) {
      if (goVar === undefined) { return false; }
      $.Immerse.scrollController.doScroll(this, $target);
    }

  }; // End of all plugin functions


  // Add jQuery Immerse object for all controllers
  $.Immerse = {}

})( jQuery, window , document );