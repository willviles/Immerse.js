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

// Section Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'sectionController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Default section settings
    ///////////////////////////////////////////////////////

    sectionDefaults: {
      animations: {},
      actions: {},
      attributes: {},
      components: {},
      options: {
        hideFromNav: false,
        unbindScroll: false
      }
    },

    // Add Section to Immerse
    ///////////////////////////////////////////////////////

    add: function(imm, id, section) {

      this.imm = imm;

      section.id = id;
      section.name = (section.hasOwnProperty('name')) ? section.name : this.imm.utils.stringify(id);
      section.element = $(this.imm.utils.sectionify.call(this.imm, id));

      var unboundTag = this.imm.utils.namespacify.call(this.imm, 'unbound'),
          unboundTagExists = section.element.attr('data-' + unboundTag) === 'true' ? true : false;

      section.options = section.hasOwnProperty('options') ? section.options : {};
      section.options.unbindScroll = section.options.hasOwnProperty('unbindScroll') ?
                                     section.options.unbindScroll :
                                     unboundTagExists;

      // Get defined defaults
      var defaults = (!this.imm.setup.hasOwnProperty('sectionDefaults')) ?
                      this.extendAllDefaults.call(this) : this.imm.setup.sectionDefaults;

      // Extend upon defaults with section options
      section = $.extend(true, {}, defaults, section);

      // Push section to Immerse setup sections object
      this.imm.setup.sections.push(section);

      return section;

    },

    // Extend Defaults
    ///////////////////////////////////////////////////////

    extendAllDefaults: function() {
      var defaults = this.sectionDefaults;
      // Extend component defaults
      defaults = $.Immerse.componentController.extendDefaults(defaults);
      // Extend global component options
      defaults = $.Immerse.componentController.extendGlobalOptions(this.imm, defaults);
      // Extend global audio options
      defaults = $.Immerse.audioController.extendGlobalOptions(this.imm, defaults);
      // Extend global attribute options
      defaults = this.extendDefaults.attributes.call(this, defaults);

      // Reassign defaults with component defaults/global options included
      this.imm.setup.sectionDefaults = defaults;

      return defaults;
    },

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {

      // Get a handle on the Immerse object
      this.imm = imm;

      var $allSectionElems = $(this.imm.utils.sectionify.call(this.imm)),
          // FIX: If no sections have been defined (all generated), ensure defaults are extended
          sectionDefaults = (!this.imm.setup.hasOwnProperty('sectionDefaults')) ? this.extendAllDefaults.call(this) : this.imm.setup.sectionDefaults,
          unboundTag = this.imm.utils.namespacify.call(this.imm, 'unbound'),
          that = this;

      // Generate all sections from DOM elements
      $.each($allSectionElems, function(i, s) {

        var $s = $(s),
            generatedSection = sectionDefaults,
            id = $s.data('imm-section'),
            n = that.imm.utils.stringify(id),
            u = $s.data(unboundTag) === true ? true : false,
            newVals = {
              element: $s,
              id: id,
              name: n,
              options: {
                unbindScroll: u
              }
            };
        generatedSection = $.extend(true, {}, generatedSection, newVals);
        that.imm._sections.push(generatedSection);
      });

      // Setup all defined sections
      $.each(this.imm.setup.sections, function(i, s) {
        // Replace generated section if section is setup specifically via js.
        $.each(that.imm._sections, function(i, _s) {
          that.imm._sections[i] = _s.id === s.id ? s : _s;
        });

        that.initSection.call(that, that.imm, s);
      });

      // Update section offsets
      $.Immerse.scrollController.updateSectionOffsets(this.imm);

      // Order sections by vertical section offset
      this.imm._sections.sort(function(obj1, obj2) {
      	return obj1.scrollOffset - obj2.scrollOffset;
      });

      // Add index to all sections
      $.each(this.imm._sections, function(i, s) {
        s.scrollIndex = i;
      });

      // Init components
      $.Immerse.componentController.init(that.imm);

      return this;
    },

    // Init section
    ///////////////////////////////////////////////////////

    initSection: function(imm, s) {
      this.imm = (this.imm === undefined) ? imm : this.imm;

      var $s = $(s.element),
          fullscreenClass = this.imm.utils.namespacify.call(this.imm, 'fullscreen'),
          that = this;

      s._register = { queue: [] };
      s._kill = {
        promise: jQuery.Deferred(),
        queue: [],
        queueCheck: function() {
          if (s._kill.queue.length === 0) { s._kill.promise.resolve('killed'); }
        }
      };

      // Register Animations
      $.each(s.animations, function(name, animation) {
        var registration = { section: s, $section: $s };
        registration.type = 'animation'; registration.name = name; registration.obj = animation;
        that.registrationHandler.call(that, registration);
      });

      // Register Actions
      $.each(s.actions, function(name, action) {
        var registration = { section: s, $section: $s };
        registration.type = 'action'; registration.name = name; registration.obj = action;
        s.registration = registration;
        that.registrationHandler.call(that, registration);
      });
      // Register Attributes
      $.each(s.attributes, function(name, attribute) {
        var registration = { section: s, $section: $s };
        registration.type = 'attribute'; registration.name = name; registration.obj = attribute;
        that.registrationHandler.call(that, registration);
      });

      // Need to systematically kill events, AND ONLY THEN re-initialize the new ones
      // Some sort of queue is required with a promise statement.
      $.each(s._kill.queue, function(i, registration) {
        that.kill.all.call(that, registration);
      });

      s._kill.queueCheck.call(this);

      $.when(s._kill.promise.promise()).then(
        function() {
          $.each(s._register.queue, function(i, registration) {
            that.register[registration.type].call(that, registration);
          });
          // Remove -fullscreen classes if scroll is programatically set to be unbound
          if ($.Immerse.scrollController.isScrollUnbound(that.imm, s)) {
            $s.removeClass(fullscreenClass);
          // Otherwise add it if it should be present
          } else {
            $s.addClass(fullscreenClass);
          };
        }
      );
    },

    // Registration Handler
    ///////////////////////////////////////////////////////

    registrationHandler: function(registration) {

      // If view targeted
      if ($.Immerse.viewportController.isView(this.imm, registration.obj)) {

        // If it's not active, register it.
        if (!registration.obj._active) {
          registration.section._register.queue.push(registration);

        // But if it is, don't re-register.
        } else {
          return;
        }

      // If view isn't targeted
      } else {
        // If it's active, we need to kill it.
        if (registration.obj._active) {
          registration.section._kill.queue.push(registration);

        // But if it isn't, it is of no consequence
        } else {
          return;
        }
      };

    },

    // Register

    register: {

    // Queue defined in init section

    // Register Section Animation
    ///////////////////////////////////////////////////////

      animation: function(registration) {

        var obj = registration.obj,
            that = this;

        // Get timeline settings
        obj._settings = obj.hasOwnProperty('settings') ? obj.settings : { };
        // Always ensure timeline is paused to start off with so Immerse runtime hooks can be used
        obj._settings['paused'] = true;

        // Get delay and repeats
        obj.delay = !isNaN(obj.delay) ? obj.delay : null;
        obj.repeat = !isNaN(obj.repeat) ? obj.repeat : null;
        if (obj.repeat) { obj._settings['repeat'] = obj.repeat; }

        // Create timeline and add content
        obj._timeline = new TimelineMax(obj._settings);
        obj._timelineContent = obj.timeline(registration.$section);

        // Runtime and reset targeting defaults
        obj.runtime = obj.hasOwnProperty('runtime') ? obj.runtime : ['enteringDown', 'enteringUp'];
        obj.reset = obj.hasOwnProperty('reset') ? obj.reset : ['exitedDown', 'exitedUp'];

        // If there's a delay, add it to start of timeline
        if (obj.delay !== null) { obj._timeline.set({}, {}, "+=" + obj.delay); }
        // Add content to the timeline
        obj._timeline.add(obj._timelineContent);

        obj._runtimeStr = ''; obj._resetStr = '';

        // Prepare runtimes
        $.each(obj.runtime, function(i, r) { obj._runtimeStr = obj._runtimeStr + ' ' + r; });
        // Prepare resets
        $.each(obj.reset, function(i, r) { obj._resetStr = obj._resetStr + ' ' + r; });

        obj._run = function(e) {
          that.imm.utils.log(that.imm, "Running " + registration.type + " '" + registration.name + "'");
          obj._timeline.play();
        }

        obj._reset = function(e) {
          that.imm.utils.log(that.imm, "Resetting " + registration.type + " '" + registration.name + "'");
          obj._timeline.pause(0, true);
        }

        registration.$section.on(obj._runtimeStr, obj['_run']);
        registration.$section.on(obj._resetStr, obj['_reset']);

        // Set starting animation state
        var currentSection = this.imm._currentSection;

        // If we're on the section the animation is registered on, set animation progress to finished
        if (currentSection !== undefined && currentSection.id === registration.section.id) {
          obj._timeline.progress(1, false);
        } else {
          obj._timeline.pause(0, true);
        };

//         this.imm.utils.log(this.imm, "Registered " + registration.type + " '" + registration.name + "'");
        obj._active = true;

      },

      // Register Section Action
      ///////////////////////////////////////////////////////

      action: function(registration) {

        var obj = registration.obj,
            that = this;

        obj.delay = !isNaN(obj.delay) ? obj.delay : null;
        obj.runtime = obj.hasOwnProperty('runtime') ? obj.runtime : ['enteringDown', 'enteringUp'];
        obj.reset = obj.hasOwnProperty('reset') ? obj.reset : ['exitedDown', 'exitedUp'];

        obj._runtimeStr = ''; obj._resetStr = '';

        // Prepare runtimes
        $.each(obj.runtime, function(i, r) { obj._runtimeStr = obj._runtimeStr + ' ' + r; });
        // Prepare resets
        $.each(obj.reset, function(i, r) { obj._resetStr = obj._resetStr + ' ' + r; });

        if (obj.hasOwnProperty('fire')) {
          obj._run = function() {
            setTimeout(function() {
              that.imm.utils.log(that.imm, "Firing " + registration.type + " '" + registration.name + "'");
              obj.fire.call(registration.obj, registration.section);
            }, obj.delay);
          }
        }

        registration.$section.on(obj._runtimeStr, obj['_run']);

        if (obj.hasOwnProperty('clear')) {
          obj._reset = function() {
            that.imm.utils.log(that.imm, "Clearing " + registration.type + " '" + registration.name + "'");
            obj.clear.call(registration.obj, registration.section);
          }
          registration.$section.on(obj._resetStr, obj['_reset']);
        }

//         this.imm.utils.log(this.imm, "Registered " + registration.type + " '" + registration.name + "'");
        obj._active = true;

      },

      // Register Section Attribute
      ///////////////////////////////////////////////////////

      attribute: function(registration) {

        var obj = registration.obj,
            that = this;

        obj.delay = !isNaN(obj.delay) ? obj.delay : null;
        obj.runtime = obj.hasOwnProperty('runtime') ? obj.runtime : ['enteringDown', 'enteringUp'];
        obj.reset = obj.hasOwnProperty('reset') ? obj.reset : ['exitedDown', 'exitedUp'];

        obj._runtimeStr = '';

        // Prepare runtimes
        $.each(obj.runtime, function(i, r) { obj._runtimeStr = obj._runtimeStr + ' ' + r; });

        obj._run = function(e) {
          setTimeout(function() {
            that.imm.utils.log(that.imm, 'Updating ' + registration.type + " '" + registration.name + "' to '" + obj.value + "'");
            that.imm.$page.trigger(registration.name, obj.value);
          }, obj.delay);
        }

        registration.$section.on(obj._runtimeStr, obj['_run']);

//         this.imm.utils.log(this.imm, "Registered " + registration.type + " '" + registration.name + "'");
        obj._active = true;
      }

    },

    // Kill
    ///////////////////////////////////////////////////////

    kill: {

      // Promise, queue, queueCheck defined in initSection

      // Kill all
      all: function(registration) {
        var obj = registration.obj;

        // Kill animation timeline
        if (registration.type === 'animation') {
          this.kill.timeline.call(this, obj._timeline);
        }

        // Kill animation & actions reset string
        if (registration.type === 'animation' || registration.type === 'action') { registration.$section.off(obj._resetStr, obj._reset); }

        // Kill animation, action and attribute runtime string
        registration.$section.off(obj._runtimeStr, obj._run);

        // Set object to not active
//         this.imm.utils.log(this.imm, "Killed " + registration.type + " '" + registration.name + "'");
        obj._active = false;

        // Remove from kill queue
        var removeFromQueue = registration.section._kill.queue.filter(function(i, queueObj) {
          return queueObj.name === registration.name && queueObj.section[0] === registration.$section[0]
        });
        registration.section._kill.queue.splice( $.inArray(removeFromQueue, registration.section._kill.queue), 1);
        registration.section._kill.queueCheck.call(this);
      },

      // Kill timeline
      timeline: function(timeline) {
        var tweens = timeline.getChildren();
        timeline.kill();
        $.each(tweens, function(i, tween) {
          if (tween.target.selector) {
            TweenMax.set(tween.target.selector, { clearProps:'all' });
          }
        });
      }
    },

    // Reinit Sections
    ///////////////////////////////////////////////////////

    reinitSections: function(imm) {

      this.imm = (this.imm === undefined) ? imm : this.imm;

      var that = this;

      $.each(this.imm._sections, function(i, s) {
        that.initSection.call(that, that.imm, s);
      });

      // Force update section offsets
      $.Immerse.scrollController.updateSectionOffsets(this.imm);
    },



    // Extend defaults
    ///////////////////////////////////////////////////////

    extendDefaults: {
      attributes: function(defaults) {
        var attributeSetupOpts = this.imm.setup.attributes;

        if (attributeSetupOpts === undefined) { return defaults; }

        defaults['attributes'] = attributeSetupOpts;

        return defaults;
      }
    },

    // Extend defaults
    ///////////////////////////////////////////////////////

    killAllEvents: function(imm) {

      this.imm = (this.imm === undefined) ? imm : this.imm;

      var that = this;

      $.each(this.imm._sections, function(i, s) {

        // Run all reset events of custom actions
        if (s.hasOwnProperty('actions')) {
          $.each(s.actions, function(name, a) {
            if (a.hasOwnProperty('clear')) { a.clear.call(s.registration, s); }
          });
        }

        // Kill all events attached to section runtimes
        s.element.off();

        // Kill all events attached to attribute changes
        if (s.hasOwnProperty('attributes')) {
          $.each(s.attributes, function(name, a) {
            that.imm.$elem.off(name);
          });
        }
      });

    }

  // End of controller
  ///////////////////////////////////////////////////////
  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      var c = new controller[n](this);
      c.init.call(c, imm);
      return c;
    },

    add: function(imm, id, section) {
      var c = new controller[n](this);
      c.add.call(c, imm, id, section);
      return c;
    },

    reinitSections: function(imm) {
      var c = new controller[n](this);
      c.reinitSections.call(c, imm);
      return c;
    },

    kill: function(imm) {
      var c = new controller[n](this);
      c.killAllEvents.call(c, imm);
    }
  }

})( jQuery, window , document );

// Scroll Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'scrollController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {

      var that = this;

      // Get a handle on the Immerse object
      this.imm = imm;
      // Test for corresponding mousewheelEvent for browser
      this.imm._mousewheelEvent = (/Firefox/i.test(navigator.userAgent))? 'DOMMouseScroll wheel' : 'mousewheel wheel';
      // Get bound/unbound status of first section
      this.imm._scrollUnbound = this.utils.isScrollUnbound.call(this, this.imm, this.imm._currentSection);
      // Manage binding or unbind of scroll on sectionChange
      this.imm.$page.on('immInit sectionChanged', function(e, d) {
        if (e.type === 'sectionChanged') {
          that.imm._scrollUnbound = that.utils.isScrollUnbound.call(that, that.imm, d.current);
        }
        $.each(that.events, function(n, f) { f.call(that); });
      });

      return this;
    },

    // Events
    ///////////////////////////////////////////////////////

    events: {
      scroll: function() {
        this.imm.$page.off( this.imm._mousewheelEvent, this.handlers.scroll.detect)
                      .on( this.imm._mousewheelEvent, this.handlers.scroll.detect.bind(this));
      },

      keys: function() {
        this.imm.$page.off('keydown keyup');
        this.imm.$page.on('keydown', this.handlers.keys.down.bind(this));
        this.imm.$page.on('keyup', this.handlers.keys.up.bind(this));
      },

      touch: function() {
        if (this.imm._isDesktop) { return false; };
        if (this.imm._htmlScrollLocked) { return };

        this.imm.$page.off('touchstart touchmove touchend');

        if (this.imm._scrollUnbound) {
          this.imm.$page.on('touchstart', this.handlers.touch.manage.bind(this))
        } else {
          this.imm.$page.on('touchstart', this.handlers.touch.start.bind(this));
        }

        this.imm.$page
          .off('swipedown swipeup')
          .on('swipedown swipeup', this.handlers.touch.detect.bind(this));
      }

    },

    // Handlers
    ///////////////////////////////////////////////////////
    //// Handles the scroll

    handlers: {

      // Scroll Handler
      scroll: {

        previousTimestamp: new Date().getTime(),

        records: [],

        recordAverage: function(elements, number) {
          var sum = 0;

          //taking `number` elements from the end to make the average, if there are not enought, 1
          var lastElements = elements.slice(Math.max(elements.length - number, 1));

          for(var i = 0; i < lastElements.length; i++){
              sum = sum + lastElements[i];
          }

          return Math.ceil(sum/number);
        },

        detect: function(e) {

          // Always allow default scrolling on elements showing when main page is locked
          if (this.imm._htmlScrollLocked) {
            this.handlers.scroll.toggle.call(this, 'enable', e);
          } else {
            if (this.imm._scrollUnbound) {
              // Enable browser scroll
              if (this.imm._browserScrollDisabled) { this.handlers.scroll.toggle.call(this, 'enable', e); }
              if (this.imm._isScrolling === false) { this.unbound.call(this, e); }
            } else {
              // Disable browser scroll
              if (!this.imm._browserScrollDisabled) { this.handlers.scroll.toggle.call(this, 'disable', e); }
              this.handlers.scroll.manage.call(this, e);
            }
          }
        },

        manage: function(e) {
          var currentTimestamp = new Date().getTime(),
              scrollValue = e.originalEvent.wheelDelta || -e.originalEvent.deltaY || -e.originalEvent.detail;

          // Manage memory
          if (this.handlers.scroll.records.length > 149) { this.handlers.scroll.records.shift(); }
          this.handlers.scroll.records.push(Math.abs(scrollValue));

          var timeDifference = currentTimestamp - this.handlers.scroll.previousTimestamp;
          this.handlers.scroll.previousTimestamp = currentTimestamp;
          // Empty scroll array if no scroll in 200ms
          if (timeDifference > 200) { this.handlers.scroll.records = []; }

          var averageRecordEnd = this.handlers.scroll.recordAverage(this.handlers.scroll.records, 10),
              averageRecordMiddle = this.handlers.scroll.recordAverage(this.handlers.scroll.records, 70),
              scrollAccelerating = averageRecordEnd >= averageRecordMiddle;

          if (scrollAccelerating) {
            var direction = this.utils.getScrollDirection(e);
            this.ifCanThenGo.call(this, this.imm, direction);
          }
        },

        toggle: function(status, e) {

          function preventDefaultScroll(e) {
            e = e || window.event;
            if (e.preventDefault) { e.preventDefault(); }
            e.returnValue = false;
          };

          if (status === 'enable') {
            if (window.removeEventListener) {
              window.removeEventListener(this.imm._mousewheelEvent, preventDefaultScroll, false);
            }
            window.onmousewheel = document.onmousewheel = null;
            window.onwheel = null;
            window.ontouchmove = null;
            this.imm._browserScrollDisabled = false;

          } else if (status === 'disable') {
            if (window.addEventListener) {
              window.addEventListener(this.imm._mousewheelEvent, preventDefaultScroll, false);
            }
            window.onwheel = preventDefaultScroll; // modern standard
            window.onmousewheel = document.onmousewheel = preventDefaultScroll; // older browsers, IE
            window.ontouchmove  = preventDefaultScroll; // mobile
            this.imm._browserScrollDisabled = true;

          }
        }

      },

      // Scroll Keys Handler
      keys: {
        down: function(e) {

          // if HTML scroll is locked, just behave normally
          if (this.imm._htmlScrollLocked) { return; };

          // If body isn't the active element, just behave normally
          if (document.activeElement !== this.imm.$page[0]) { return; }

          if (!this.imm._scrollUnbound && this.imm._lastKey && this.imm._lastKey.which == e.which) {
            e.preventDefault();
            return;
          }

          this.imm._lastKey = e;

          switch(e.which) {

            case 38: // up
              if (this.imm._scrollUnbound) {
                this.unbound.call(this, e);
              } else {
                e.preventDefault();
                this.ifCanThenGo.call(this, this.imm, 'UP');
              }
            break;

            case 40: // down
              if (this.imm._scrollUnbound) {
                this.unbound.call(this, e);
              } else {
                e.preventDefault();
                this.ifCanThenGo.call(this, this.imm, 'DOWN');
              }
            break;

            case 9: // tab

              $.Immerse.focusController.tabPress(this.imm, e);

            break;

            case 32: // space

              if (e.target == this.imm.$page[0]) {
                e.preventDefault();
                return false;
              }

            break;

            default: return; // exit this handler for other keys
          }
        },

        up: function(e) {
          this.imm._lastKey = null;
        }

      },

      // Scroll Touch Handler
      touch: {

        checking: false,

        manage: function(e) {
          if (this.handlers.touch.checking) { return; }
          this.handlers.touch.checkInterval = setInterval(this.unbound.bind(this, e), 20);
          this.handlers.touch.checking = true;
        },

        start: function(e) {
          var data = e.originalEvent.touches ? e.originalEvent.touches[ 0 ] : e;
          this.imm._touchStartData = {
            time: (new Date).getTime(),
            coords: [ data.pageX, data.pageY ]
          };

          this.imm.$page
            .on('touchmove', this.handlers.touch.move.bind(this))
            .one('touchend', this.handlers.touch.end.bind(this));
        },

        move: function(e) {
          if (!this.imm._touchStartData) { return; }
          var data = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
          this.imm._touchStopData = {
            time: (new Date).getTime(),
            coords: [ data.pageX, data.pageY ]
          };

          // prevent scrolling
          if (Math.abs(this.imm._touchStartData.coords[1] - this.imm._touchStopData.coords[1]) > 10) {
            e.preventDefault();
          }
        },

        end: function(e) {
          this.imm.$page.off('touchmove', this.handlers.touch.move);
          if (this.imm._touchStartData && this.imm._touchStopData) {
            if (this.imm._touchStopData.time - this.imm._touchStartData.time < 1000 &&
                Math.abs(this.imm._touchStartData.coords[1] - this.imm._touchStopData.coords[1]) > 30 &&
                Math.abs(this.imm._touchStartData.coords[0] - this.imm._touchStopData.coords[0]) < 75) {
                  var direction = this.imm._touchStartData.coords[1] > this.imm._touchStopData.coords[1] ? 'swipeup' : 'swipedown';
                  this.imm.$page.trigger(direction);
            }
          }
          this.imm._touchStartData = this.imm._touchStopData = undefined;
        },

        detect: function(e) {
          if (this.imm._scrollUnbound) { return; }
          switch(e.type) {
            case 'swipedown':
              this.ifCanThenGo.call(this, this.imm, 'UP');
            break;

            case 'swipeup':
              this.ifCanThenGo.call(this, this.imm, 'DOWN');
            break;

            default: return;
          }
        },

        killInertiaThenGo: function(dir) {
          clearInterval(this.handlers.touch.checkInterval);
          this.handlers.touch.checking = false;
          this.imm.$page[0].style.overflow = 'hidden';
          setTimeout(function() {
            this.imm.$page[0].style.overflow = '';
            this.imm._scrollUnbound = false;
            this.ifCanThenGo.call(this, this.imm, dir);
          }.bind(this), 10);
        }
      }
    },

    ifCanThenGo: function(imm, goVar) {
      this.imm = (this.imm === undefined) ? imm : this.imm;
      if (this.imm._isScrolling === false && this.imm._htmlScrollLocked !== true) {
        this.go.fire.call(this, goVar);
      }
    },

    // Fire scrollChange
    go: {

      prepare: function(o) {
        var a = { currentSection: this.imm._currentSection, scrollAnchor: 'top' },
          that = this;

        a.$currentSection = $(a.currentSection.element);
        a.currentSectionIndex = this.imm._sections.indexOf(a.currentSection);

        // If we've passed a jQuery object directly, use it as the next section
        if (o === 'UP' || o === 'DOWN') {
          a.direction = o;
          a.nextSection = (a.direction === 'UP') ? this.imm._sections[a.currentSectionIndex-1] : this.imm._sections[a.currentSectionIndex+1];
        } else {
          a.nextSection = $.grep(this.imm._sections, function(s) { return o == s.id; })[0];
          // Determine direction
          a.direction = a.currentSection.scrollOffset > a.nextSection.scrollOffset ? 'UP' : 'DOWN';
          // Just do scroll
          a.justDoScroll = true;
        }

        // Setup direction triggers
        if (a.direction === 'UP') {
          a.triggers = { exiting: 'exitingUp', entering: 'enteringUp', exited: 'exitedUp', entered: 'enteredUp' }
        } else if (a.direction === 'DOWN') {
          a.triggers = { exiting: 'exitingDown', entering: 'enteringDown', exited: 'exitedDown', entered: 'enteredDown' }
        }

        // If there's no new section, don't scroll!
        if (a.nextSection === undefined) { return false; }

        a.$nextSection = $(a.nextSection.element);
        a.nextSectionIndex = this.imm._sections.indexOf(a.nextSection);
        this.imm._sectionAbove = this.imm._sections[a.nextSectionIndex-1];
        this.imm._sectionBelow = this.imm._sections[a.nextSectionIndex+1];

        return a;
      },

      fire: function(o) {

        var opts = this.go.prepare.call(this, o);

        if (opts === false) {
          return false;
        }

        // Log change
        this.imm.utils.log(this.imm, "-------------------------------------");
        this.imm.utils.log(this.imm, "Changing section to '" + opts.nextSection.id + "'");
        this.imm.utils.log(this.imm, "-------------------------------------");

        // If we've passed a direct trigger, just do the scroll and don't worry about bound status
        if (opts.justDoScroll === true) {
          this.go.animate.call(this, opts);
          return;
        }

        var currentSectionUnbound = $.Immerse.scrollController.isScrollUnbound(this.imm, opts.currentSection),
            nextSectionUnbound = $.Immerse.scrollController.isScrollUnbound(this.imm, opts.nextSection);

        // SCROLL LOGIC:
        // Just change section if...
        // 1) currentSection is unbound && nextSection is unbound
        // 2) currentSection is bound, nextSection is unbound && direction is up
        // Animate change if..
        // 1) nextSection is bound
        // 2) currentSection is bound, nextSection is unbound && direction is down
        if (nextSectionUnbound) {
          if (currentSectionUnbound) {
            this.go.change.call(this, opts);
          } else {
            if (opts.direction === 'UP') {
              opts.scrollAnchor = 'bottom';
              this.go.animate.call(this, opts);
            } else if (opts.direction === 'DOWN') {
              this.go.animate.call(this, opts);
            }
          }
        } else {
          this.go.animate.call(this, opts);
        }
      },

      animate: function(opts) {

        this.imm._isScrolling = true;

        // New section scroll offset
        var dist = opts.nextSection.scrollOffset,
            dur = this.imm.setup.options.scroll.duration,
            easing = this.imm.setup.options.scroll.easing,
            that = this;

        // On the rare occasion we're scrolling to the bottom of the div instead.
        if (opts.scrollAnchor === 'bottom') {
          dist = (opts.nextSection.scrollOffset + opts.$nextSection.outerHeight()) - this.imm._windowHeight;
        }

        // Set current section to exiting
        opts.$currentSection.trigger(opts.triggers.exiting);
        // Set new section to entering
        opts.$nextSection.trigger(opts.triggers.entering);
        // Set variables
        that.imm._lastSection = opts.currentSection;
        that.imm._currentSection = opts.nextSection;

        // Set new section as current section
        that.imm.$page.trigger('sectionChanged', [{
          last: that.imm._lastSection,
          current: that.imm._currentSection,
          below: that.imm._sectionBelow,
          above: that.imm._sectionAbove
        }]);

        TweenLite.to(that.imm.$page, dur, {
          scrollTo: { y: dist, autoKill: false },
          ease: easing,
          onComplete: function() {
            // Set new section to entered
            opts.$nextSection.trigger(opts.triggers.entered);
            // Set current section to exited
            opts.$currentSection.trigger(opts.triggers.exited);
            // Reset flags
            that.imm._isScrolling = false;
          }
        });
      },

      change: function(opts) {

        var that = this;

        // Set current section to exiting
        opts.$currentSection.trigger(opts.triggers.exiting);
        // Set new section to entering and entered
        opts.$nextSection.trigger(opts.triggers.entering);
        opts.$nextSection.trigger(opts.triggers.entered);

        // 1) Setup listeners to check whether opts.$currentSection has been exited (scrolled fully out of view).
        // 2) When they have, cancel the listeners.

        // Set variables
        this.imm._lastSection = opts.currentSection;
        this.imm._currentSection = opts.nextSection;
        // We're done, so set new section as current section
        this.imm.$page.trigger('sectionChanged', [{
          last: that.imm._lastSection,
          current: that.imm._currentSection,
          below: that.imm._sectionBelow,
          above: that.imm._sectionAbove
        }]);
      }
    },

    unbound: function(e) {

      var isAbove = this.detectAbove.call(this),
          isBelow = this.detectBelow.call(this);

      // If scrollTop is above current section
      if (isAbove) {

        // If it's a scroll event and we're not scrolling upwards (i.e, we're just at the top of the section)
        if (this.utils.isScrollEvent(e) && this.utils.getScrollDirection(e) !== 'UP') { return; }
        // If it's a keydown event and we're not pressing upwards
        if (this.utils.isKeydownEvent(e) && e.which !== 38) { return; }
        // If above section is also unbound
        if ($.Immerse.scrollController.isScrollUnbound(this.imm, this.imm._sectionAbove)) {
          // Just change section references.
          this.ifCanThenGo.call(this, this.imm, 'UP');
        // If above section is not unbound, do a scroll
        } else {
          e.preventDefault();

          if (this.utils.isTouchEvent(e)) {
            // Kill inertia then go
            this.handlers.touch.killInertiaThenGo.call(this, 'UP');

          } else {
            // Set scroll unbound to false
            this.imm._scrollUnbound = false;
            this.ifCanThenGo.call(this, this.imm, 'UP');
          }
        }

      // If scrollTop is above current section

      } else if (isBelow) {
        // Clear interval
        clearInterval(this.handlers.touch.checkInterval);
        this.handlers.touch.checking = false;
        // If it's a scroll event and we're not scrolling download (i.e, we're just at the bottom end of the section)
        if (this.utils.isScrollEvent(e) && this.utils.getScrollDirection(e) !== 'DOWN') { return; }
        // If it's a keydown event and we're not pressing upwards
        if (this.utils.isKeydownEvent(e) && e.which !== 40) { return; }
        // If below section is also unbound
        if ($.Immerse.scrollController.isScrollUnbound(this.imm, this.imm._sectionBelow)) {
          // Just change section references.
          this.ifCanThenGo.call(this, this.imm, 'DOWN');
        // If below section is not unbound, do a scroll
        } else {
          e.preventDefault();

          if (this.utils.isTouchEvent(e)) {
            // Kill inertia then go
            this.handlers.touch.killInertiaThenGo.call(this, 'DOWN');

          } else {
            // Set scroll unbound to false
            this.imm._scrollUnbound = false;
            this.ifCanThenGo.call(this, this.imm, 'DOWN');
          }
        }
      }
    },

    detectAbove: function() {
      if (this.imm._sectionAbove === undefined) { return false; }
      return isAbove = this.imm._isTouch ?
                      this.imm.$page.scrollTop() < this.imm._currentSection.scrollOffset :
                      this.imm.$page.scrollTop() <= this.imm._currentSection.scrollOffset;
    },

    detectBelow: function() {

      if (this.imm._sectionBelow === undefined) { return false; }

      // If next section is not also unbound, ensure it scrolls to new section from a window height away
      var belowVal = $.Immerse.scrollController.isScrollUnbound(this.imm, this.imm._sectionBelow) === false ?
                     this.imm._sectionBelow.scrollOffset - this.imm._windowHeight :
                     this.imm._sectionBelow.scrollOffset;

      return isBelow = this.imm._isTouch ?
                      this.imm.$page.scrollTop() > belowVal :
                      this.imm.$page.scrollTop() >= belowVal;
    },

    sectionOffset: {
      set: function(s, st) {
        s.scrollOffset = st + $(s.element).position().top;
      },

      update: function(imm) {
        this.imm = (this.imm === undefined) ? imm : this.imm;

        var st = this.imm.$page.scrollTop();

        $.each(this.imm._sections, function(i, s) {
          this.sectionOffset.set.call(this, s, st);
        }.bind(this));

      }
    },

    stick: function(imm) {
      this.imm = (this.imm === undefined) ? imm : this.imm;
      if (!this.imm._scrollUnbound) {
        var t = this.imm._currentSection.scrollOffset;
        this.imm.$page.scrollTop(t);
      }
    },

    utils: {
      isScrollEvent: function(e) {
        return e.type === 'wheel' || e.type === 'DOMMouseScroll' || e.type === 'mousewheel';
      },

      isTouchEvent: function(e) {
        return e.type === 'touch' || e.type === 'touchstart' || e.type === 'touchend' || e.type === 'touchmove';
      },

      getScrollDirection: function(e) {
        var direction;
        if(typeof e.originalEvent.detail == 'number' && e.originalEvent.detail !== 0) {
          if(e.originalEvent.detail > 0) {
            direction = 'DOWN';
          } else if(e.originalEvent.detail < 0){
            direction = 'UP';
          }
        } else if (typeof e.originalEvent.wheelDelta == 'number') {
          if(e.originalEvent.wheelDelta < 0) {
            direction = 'DOWN';
          } else if(e.originalEvent.wheelDelta > 0) {
            direction = 'UP';
          }
        } else if (typeof e.originalEvent.deltaY == 'number') {
          if(e.originalEvent.deltaY > 0) {
            direction = 'DOWN';
          } else if (e.originalEvent.deltaY < 0) {
            direction = 'UP';
          }
        }
        return direction;
      },

      isKeydownEvent: function(e) {
        return e.type === 'keydown';
      },

      isScrollUnbound: function(imm, section) {

        this.imm = (this.imm === undefined) ? imm : this.imm;

        var status = section.options.unbindScroll ? section.options.unbindScroll : false,
            enableOn = {};

        if ($.isArray(status)) {
          enableOn.breakpoints = status;
        } else if (status !== true) {
          // Set scrollUnbound to false
          return status;
        }

        return $.Immerse.viewportController.isView(this.imm, enableOn);

      }
    },

    htmlScroll: function(imm, status) {
      this.imm = (this.imm === undefined) ? imm : this.imm;

      if (status === 'lock') {
        $('html').css('overflow', 'hidden');
        this.imm._htmlScrollLocked = true;
      } else {
        $('html').css('overflow', 'scroll');
        this.imm._htmlScrollLocked = false;
      }

    },

    kill: function(imm) {
      this.imm = (this.imm === undefined) ? imm : this.imm;
      // Remove all Immerse scroll event handlers
      this.imm.$page.off('keydown keyup touchmove touchstart swipedown swipeup');
      // Remove all events attached to the mousewheel and wheel events
      this.imm.$page.off(this.imm._mousewheelEvent);
      // Ensure default behaviour is restored
      this.imm.$page.on(this.imm._mousewheelEvent, function(e) {
        window.onmousewheel = document.onmousewheel = null;
        window.onwheel = null;
        window.ontouchmove = null;
        return true;
      });


    }



  // End of controller
  ///////////////////////////////////////////////////////

  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      return new controller[n](this).init(imm);
    },
    doScroll: function(imm, goVar) {
      var c = new controller[n](this);
      c.ifCanThenGo.call(c, imm, goVar);
      return c;
    },
    updateSectionOffsets: function(imm) {
      var c = new controller[n](this);
      c.sectionOffset.update.call(c, imm);
      return c;
    },
    stickSection: function(imm) {
      var c = new controller[n](this);
      c.stick.call(c, imm);
      return c;
    },
    htmlScroll: function(imm, status) {
      return new controller[n](this).htmlScroll(imm, status);
    },
    isScrollUnbound: function(imm, section) {
      return new controller[n](this).utils.isScrollUnbound(imm, section);
    },
    kill: function(imm) {
      var c = new controller[n](this);
      c.kill.call(c, imm);
    }
  }

})( jQuery, window , document );

// Audio Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'audioController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Extend global audio options
    ///////////////////////////////////////////////////////

    extendGlobalOptions: function(imm, defaults) {

      var audioSetupOpts = imm.setup.audio;

      if (audioSetupOpts !== undefined) {
        defaults['audio'] = audioSetupOpts;
      }

      return defaults;
    },

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {

      // Get a handle on the Immerse object
      this.imm = imm;
      this.imm._audioPlaying = [];

      var that = this;

      // Ensure mute buttons are in correct state
      this.muteBtns.init.call(this);
      // Setup audio for initial section
      this.handleChange.call(this, this, this.imm._currentSection.audio);
      // Setup audio change when a section changes
      this.imm.$page.on('sectionChanged', function(e, d) {
        that.handleChange.call(that, that, d.current.audio);
      });
      // Handle muting when window is closed
      this.handleBlurFocus.call(this);

      return this;
    },

    // Handle Change
    ///////////////////////////////////////////////////////

    handleChange: function(that, audioObj) {

      if (this.imm._muted) { return false; }

      this.imm._audioPlaying = [];

      this.start.call(this, audioObj);

      var audioToMute = this.imm._allAudio.filter(function(a) {
        return $.inArray(a, that.imm._audioPlaying) === -1;
      });

      this.mute.call(this, audioToMute);

    },

    // Start
    ///////////////////////////////////////////////////////

    start: function(audioObj) {

      var that = this;

      if (audioObj !== undefined) {
        // Transition new audio to play
        $.each(audioObj, function(name, o) {

          var $a = $('audio#' + name), // Get audio
              d = !isNaN(o.delay) ? o.delay : 0; // If a delay is set

          if ($a.length === 0) {
            that.imm.utils.log(that.imm, "Asset Failure: Could not play audio asset '" + name + "'"); return;
          }

          // Push to playing array
          that.imm._audioPlaying.push(name);

          // If it's not already playing, make sure volume is set at 0 before it fades in.
          if ($a[0].paused) { $a[0].volume = 0; $a[0].play(); }
          // Transition the sound
          TweenMax.to($a, o.changeDuration, { volume: o.volume, ease: Linear.easeNone, delay: d });
        });
      }

    },

    // Mute
    ///////////////////////////////////////////////////////

    mute: function(audioToMute) {
      // Mute audio
      $.each(audioToMute, function(i, name) {
        var $a = $('audio#' + name); // Get audio
        TweenMax.to($a, 1, {
          volume: 0, ease: Linear.easeNone, onComplete: function() { $a[0].pause(); $a[0].currentTime = 0; }
  		  });

      });

    },

    // MuteBtns
    ///////////////////////////////////////////////////////

    muteBtns: {

      // MuteBtns Init
      ///////////////////////////////////////////////////////

      init: function() {

        var muteClass = this.imm.utils.namespacify.call(this.imm, 'mute'),
            that = this;

        // Get a handle on all mute buttons
        this.imm._$muteBtns = $('.' + muteClass, 'body');

        // Set initial value based on state
        if (this.imm.utils.cookies.get('immAudioState') === 'muted') {
          this.muteBtns.change.call(this, 'off');
        } else {
          this.muteBtns.change.call(this, 'on');
        }

        // Watch for changes
        this.imm._$muteBtns.on('click', function() {
          that.muteBtns.click.call(that);
        });

      },

      // MuteBtns Change
      ///////////////////////////////////////////////////////

      change: function(state) {
        var mutedClass = this.imm.utils.namespacify.call(this.imm, 'muted'),
            s;

        if (state === 'off') {
          s = this.imm.setup.options.muteButton.muted;
          this.imm._$muteBtns.addClass(mutedClass).html(s);
          this.imm._muted = true;
        } else {
          s = this.imm.setup.options.muteButton.unmuted;
          this.imm._$muteBtns.removeClass(mutedClass).html(s);
          this.imm._muted = false;
        }
      },

      // MuteBtns MuteAll
      ///////////////////////////////////////////////////////

      muteAll: function(imm) {
        this.imm = (this.imm === undefined) ? imm : this.imm;
        var audioToMute = this.imm._audioPlaying;
        this.mute.call(this, audioToMute);
        this.muteBtns.change.call(this, 'off');
        this.imm.utils.cookies.set.call(this, 'immAudioState', 'muted', 3650);
      },

      // MuteBtns UnmuteAll
      ///////////////////////////////////////////////////////

      unmuteAll: function(imm) {
        this.imm = (this.imm === undefined) ? imm : this.imm;
        var currentAudio = this.imm._currentSection.audio;
        this.start.call(this, currentAudio);
        this.muteBtns.change.call(this, 'on');
        this.imm.utils.cookies.set.call(this, 'immAudioState', '', 3650);
      },

      // MuteBtns Click
      ///////////////////////////////////////////////////////

      click: function() {
        // If audio is muted, turn it on
        if (this.imm._muted) {
          this.muteBtns.unmuteAll.call(this);
        // Else if it's on, mute it
        } else {
          this.muteBtns.muteAll.call(this);
        }
      }
    },

    // Handle Blur Focus
    ///////////////////////////////////////////////////////

    handleBlurFocus: function() {

      var that = this;

      $(window).on('blur', function() {
        var audioToMute = that.imm._audioPlaying;
        if (!that.imm._muted) { that.mute.call(that, audioToMute); }
      });

      $(window).on('focus', function() {
        var currentAudio = that.imm._currentSection.audio;
        if (!that.imm._muted) { that.start.call(that, currentAudio); }
      });
    },

    // Kill
    ///////////////////////////////////////////////////////

    kill: function(imm) {
      this.imm = (this.imm === undefined) ? imm : this.imm;

      var audioToMute = this.imm._audioPlaying,
          that = this;

      if (!this.imm._muted) { that.mute.call(that, audioToMute); }
    }

  // End of controller
  ///////////////////////////////////////////////////////

  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      return new controller[n](this).init(imm);
    },
    extendGlobalOptions: function(imm, defaults) {
      return new controller[n](this).extendGlobalOptions(imm, defaults);
    },
    changeStatus: function(imm, status) {
      var c = new controller[n](this);
      if (status === 'unmute') {
        c.muteBtns.unmuteAll.call(c, imm);
      } else if (status === 'mute') {
        c.muteBtns.muteAll.call(c, imm);
      }
      return c;
    },

    kill: function(imm) {
      var c = new controller[n](this);
      c.kill.call(c, imm);
    }
  }

})( jQuery, window , document );

// Navigation Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'navigationController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {
      this.imm = imm;
      this.navListNamespace = this.imm.utils.namespacify.call(this.imm, 'nav');
      this.navListDataTag = this.imm.utils.datatagify.call(this.imm, this.navListNamespace);
      this.navLinkClass = this.imm.utils.namespacify.call(this.imm, 'nav-link');
      this.sectionDataTag = this.imm.utils.namespacify.call(this.imm, 'to-section');
      var that = this;
      // Generate Nav list
      this.addToDOM.call(this);
      // Set current
      var navItem = $(this.navListDataTag + ' a[data-' + this.sectionDataTag + '="' + this.imm._currentSection.id + '"]');
      this.update.call(this, navItem);
      // Handle nav item click
      this.handleClick.call(this);
      // Handle on section change
      this.sectionChange.call(this);
    },

    // Handle a click on a nav item
    ///////////////////////////////////////////////////////

    handleClick: function() {
      var that = this;
      $(this.navListDataTag + ' li a', 'body').on('click', function() {
        var target = $(this).data(that.sectionDataTag);
        if (target !== that.imm._currentSection.id) {
          $.Immerse.scrollController.doScroll(that.imm, target);
        }
      });
    },

    // Handle navigation change when section changes
    ///////////////////////////////////////////////////////

    sectionChange: function() {
      var that = this;
      this.imm.$page.on('sectionChanged', function(e, d) {
        var navItem = $(that.navListDataTag + ' a[data-' + that.sectionDataTag + '="' + d.current.id + '"]');
        that.update.call(that, navItem);
      });
    },

    // Generate nav list and add to DOM
    ///////////////////////////////////////////////////////

    addToDOM: function() {
      var nav = $(this.navListDataTag);
      if (nav.length === 0) { return false; }
      var str = '',
          that = this;

      $.each(this.imm._sections, function(i, s) {
        if (!s.options.hideFromNav) {
          str = str + '<li><a class="' + that.navLinkClass + '" data-' + that.sectionDataTag + '="' + s.id + '"><span>' + s.name + '</span></a></li>';
        }
      });

      nav.html('<ul>' + str + '</ul>');
    },

    // Update nav
    ///////////////////////////////////////////////////////

    update: function($e) {
      $(this.navListDataTag + ' li a').removeClass('current');
      if ($e.length > 0) { $e.addClass('current'); }
    }

  // End of controller
  ///////////////////////////////////////////////////////
  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      return new controller[n](this).init(imm);
    }
  }

})( jQuery, window , document );

// Asset Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'assetController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Register Assets
    ///////////////////////////////////////////////////////

    register: function(imm) {

      // Get a handle on the Immerse object
      this.imm = imm;

      // If no assets defined, bugger it
      if (this.imm._assets === undefined) { return false; }

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

          if (that.imm._isTouch && (a.type === 'video' || a.type === 'audio')) { return; }
          // Catch any error in instantiating asset
          if (a.error) {
            that.imm.utils.log(that.imm, "Asset Failure: Could not preload " + a.type + " asset '" + n + "'");
            return;
          }
          assetQueue.push({name: n, asset: a});
        }

      });

      $.each(assetQueue, function(i, a) {

        var n = a.name,
            a = a.asset;

        // Check if connection is fast enough to load audio/video
        if (a.type === 'audio' || a.type === 'video') {
          if (that.imm._isTouch) { return }
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

        if (a.path === undefined ) {
          this.imm.utils.log(this.imm, "Asset Error: Must define a path for audio asset '" + n + "'");
          a.error = true;
          return false
        };

        var l = a.loop == true ? 'loop' : '',
            fileTypes = ($.isArray(a.fileTypes)) ? a.fileTypes : ['mp3'],
            audioClass = this.imm.utils.namespacify.call(this.imm, 'audio'),
            sourceStr = '';

        $.each(fileTypes, function(i, ft) {
          sourceStr = sourceStr + '<source src="' + a.path + '.' + ft +'" type="audio/' + ft + '">';
        });

        this.imm.$page.append('<audio id="' + n + '" class="' + audioClass + '" ' + l + '>' + sourceStr + '</audio>');
        this.imm._allAudio.push(n);
        return true;
      },

      // Video
      video: function(n, o) {

        if (o.path === undefined ) {
          this.imm.utils.log(this.imm, "Asset Error: Must define a path for video asset '" + n + "'");
          o.error = true;
          return false
        };

        var videoDataTag = this.imm.utils.namespacify.call(this.imm, 'video'),
            $wrapper = this.imm.$page.find('[data-' + videoDataTag + '="' + n + '"]'),
            fileTypes = ($.isArray(o.fileTypes)) ? o.fileTypes : ['mp4', 'ogv', 'webm'],
            loop = (o.loop === false) ? '' : 'loop="loop" ',
            sourceStr = '';

        $wrapper.css('background-image', 'url(' + o.path + '.jpg)');

        // If we're on a mobile device, don't append video tags
        if (this._isTouch) { return false; }

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
      var loadingNamespace = this.imm.utils.namespacify.call(this.imm, 'loading'),
          loadingDataTag = this.imm.utils.datatagify.call(this.imm, loadingNamespace),
          loadedNamespace = this.imm.utils.namespacify.call(this.imm, 'loaded'),
          minLoadingTime = this.imm.setup.options.minLoadingTime,
          minLoadingTime = (minLoadingTime !== undefined) ? minLoadingTime : 0,
          minLoadingTime = ($.isNumeric(minLoadingTime)) ? minLoadingTime : 0,
          that = this;

      this._loadingTime = 0;

      var timeSinceInit = setInterval(function() {
        that._loadingTime++;
      }, 1);

      $.when(this.imm._assetQueue).then(
        function(s) {

          // Calculate remaining load time to meet min load time
          var remainingLoad = minLoadingTime - this._loadingTime,
              remainingLoad = (remainingLoad >= 0) ? remainingLoad : 0;

          clearInterval(timeSinceInit);

          setTimeout(function() {
            // Run init on all sections
            $.each(this.imm._sections, function(i, s) {
              $(s.element).trigger('init');
            });
            // Trigger init of whole plugin
            this.imm.$page.trigger('immInit');
            this.imm._isInitialized = true;
            // Hide loading
            $(loadingDataTag).addClass(loadedNamespace);
            this.imm.$page.addClass(loadedNamespace);
          }.bind(this), remainingLoad);

        }.bind(this),
        function(s) {
          alert('Asset loading failed');
        }.bind(this)
      );

    }

  // End of controller
  ///////////////////////////////////////////////////////

  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    register: function(imm) {
      return new controller[n](this).register(imm);
    },

    loading: function(imm) {
      return new controller[n](this).loading(imm);
    }
  }

})( jQuery, window , document );

// Viewport Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'viewportController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {

      // Get a handle on the Immerse object
      this.imm = imm;

      this.imm._windowWidth = $(window).width();
      this.imm._windowHeight = $(window).height();
      this.imm.setup.options.breakpoints = this.prepareBreakpoints.call(this);
      this.detectDevice.call(this);
      this.set.call(this, this.imm._windowWidth);
      $(window).on('resize', this.resize.bind(this));

      return this;
    },

    // Prepare breakpoints
    ///////////////////////////////////////////////////////

    prepareBreakpoints: function() {
      var breakpoints = this.imm.setup.options.breakpoints,
          breakpointArray = [];

      // Prepare breakpoints for sorting
      $.each(breakpoints, function(name, width) {
        var niceName = name.charAt(0).toUpperCase() + name.slice(1),
            obj = {name: name, niceName: niceName, width: width};
        breakpointArray.push(obj);
      });

      // Reassign ordered array to breakpoints variable
      return breakpointArray.sort(function(a, b) { return a.width - b.width });

    },

    // Detect Device
    ///////////////////////////////////////////////////////

    detectDevice: function() {

      if ('ontouchstart' in window || 'onmsgesturechange' in window) {
        this.imm._device = 'touch'; this.imm._isTouch = true; this.imm._isDesktop = false;
      } else {
        this.imm._device = 'desktop'; this.imm._isTouch = false; this.imm._isDesktop = true;
      }

    },

    // Set
    ///////////////////////////////////////////////////////

    set: function(width) {

      // Detect breakpoints & devices
      var breakpoints = this.imm.setup.options.breakpoints,
          currentBreakpoint = this.imm._breakpoint,
          prevBreak = 0,
          that = this;

      // Set largest as default. It'll be overwritten if we're in the correct viewport.
      var newBreakpoint = breakpoints[breakpoints.length-1]['name'];

      $.each(breakpoints, function(i, obj) {
        // Set all direct flags to false
        that.imm['_is' + obj.niceName] = false;
        if (width > prevBreak && width <= obj.width) {
          // Update breakpoint flags
          newBreakpoint = obj.name;
          that.imm['_is' + obj.niceName] = true;
        }
        prevBreak = obj.width;
      });

      // If we've got a newBreakpoint detected, do something about it!
      if (currentBreakpoint !== newBreakpoint) {
        this.imm._breakpoint = newBreakpoint;
        if (currentBreakpoint) {
          $.Immerse.sectionController.reinitSections(this.imm);
          this.imm.utils.log(this.imm, "Screen resized to '" + newBreakpoint + "'");
        }
      }
    },

    // Resize
    ///////////////////////////////////////////////////////

    resize: function() {
      // Set new width and height
      this.imm._windowWidth = $(window).width();
      this.imm._windowHeight = $(window).height();
      // Set viewport
      this.set.call(this, this.imm._windowWidth);
      // Update section offsets
      $.Immerse.scrollController.updateSectionOffsets(this.imm);
      // Stick current section to position
      $.Immerse.scrollController.stickSection(this.imm);
      // Call onResize function of each component
      $.Immerse.componentController.resize(this.imm);
    },

    // IsView
    ///////////////////////////////////////////////////////

    isView: function(imm, a) {

      this.imm = imm;

      // If not defined, run on all devices and/or breakpoints
      if (a.devices === undefined) { a.devices = ['touch', 'desktop']; }
      if (a.breakpoints === undefined) {
        var allBreakpoints = [];
        $.each(this.imm.setup.options.breakpoints, function(i, obj) { allBreakpoints.push(obj.name); })
        a.breakpoints = allBreakpoints;
      }

      // If currentDevice isn't defined in devices array, return false.
      if ($.inArray(this.imm._device, a.devices) === -1) { return false; }
      // ...We're now on the right device!
      // If currentbreakpoint isn't defined in breakpoints array, return false.
      if ($.inArray(this.imm._breakpoint, a.breakpoints) === -1) { return false; }

      return true;
    },

    // Kill
    ///////////////////////////////////////////////////////

    kill: function() {
      $(window).off('resize', this.resize);
    }

  // End of controller
  ///////////////////////////////////////////////////////

  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      return new controller[n](this).init(imm);
    },
    isView: function(imm, a) {
      return new controller[n](this).isView(imm, a);
    },
    kill: function() {
      var c = new controller[n](this);
      c.kill.call(this);
    }
  }

})( jQuery, window , document );

// State Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'stateController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {
      this.imm = imm;
      var that = this;

      this.baseUrl = window.location.href.split("#")[0];
      this.hash = window.location.href.split("#")[1];

      // If no hash in URL, set section to first and do not proceed
      if (this.imm.setup.options.hashChange !== true) {
        this.setSection.call(this, 'first');
        return false;
      }

      // Hash defined
      if (this.hash) {

        var hashMatch = this.findSection.call(this, this.hash),
            hashesMatched = hashMatch.length;

         // If matches section
        if (hashesMatched > 0) {

          // If one section, go to it
          if (hashesMatched === 1) {
            this.setSection.call(this);

          // If multiple sections, alert developer
          } else {
            this.imm.utils.log(this.imm, "State Error: More than one section referenced as '" + this.hash + "'");
          }

        // If it doesn't match
        } else {

          // Set to first section and log lack of match
          this.setSection.call(this, 'first');
          history.replaceState({}, "", this.baseUrl);
          this.imm.utils.log(this.imm, "State Error: No section referenced as '" + this.hash + "'");
        }

      // No hash defined
      } else {
        this.setSection.call(this, 'first');

      }

      // Set up hash handling on section change
      this.imm.$page.on('sectionChanged', function(e, d) {
        that.hashChange.call(that, d);
      });

      return this;
    },


    // Set Section
    ///////////////////////////////////////////////////////

    setSection: function(o) {

      if (o === 'first') {
        this.imm._currentSection = this.imm._sections[0];
        this.imm._sectionBelow = this.imm._sections[1];
      } else {
        this.imm._currentSection = this.findSection.call(this, this.hash)[0];
        this.imm._sectionBelow = this.imm._sections[this.imm._currentSection.scrollIndex + 1];
        this.imm._sectionAbove = this.imm._sections[this.imm._currentSection.scrollIndex - 1];
      }

      this.imm.$page.on('immInit', function(e) {
        this.imm.$page.scrollTop(this.imm._currentSection.scrollOffset);
        this.imm._currentSection.element.trigger('enteringDown');
        this.imm._currentSection.element.trigger('enteredDown');
      }.bind(this));
    },

    // Find Section
    ///////////////////////////////////////////////////////

    findSection: function(hash) {
      return this.imm._sections.filter(function(s) {
        return s.id === hash;
      });
    },

    // Hash Change
    ///////////////////////////////////////////////////////

    hashChange: function(d) {
      var hash = (d.current.scrollIndex === 0) ? this.baseUrl : '#' + d.current.id;
      history.replaceState({}, "", hash);
    }

  // End of controller
  ///////////////////////////////////////////////////////
  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      return new controller[n](this).init(imm);
    }
  }

})( jQuery, window , document );

// Focus Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  var controller = { name: 'focusController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Initialize
    ///////////////////////////////////////////////////////

    init: function(imm) {
      this.imm = imm;
      var that = this;

      this.imm.$page.attr('tabindex', -1);
      this.returnFocusToPage.call(this);

      this.imm.$page.on('sectionChanged', function(e, d) {
        this.returnFocusToPage.call(this);
      }.bind(this));
      return this;
    },

    // Tab Press
    ///////////////////////////////////////////////////////

    tabPress: function(imm, e) {

      // Get a handle on the Immerse object
      this.imm = imm;

      // Find form
      var $form = $(this.imm._currentSection.element).find('form');
      if ($form.length === 0) { e.preventDefault(); return; }

      // Find inputs inside form
      var $inputs = $('input, textarea, button, select', $form);
      if ($inputs.length === 0) { e.preventDefault(); return; }

      var firstInput = $inputs[0],
          lastInput = $inputs[$inputs.length - 1],
          that = this;

      // Set first input as focus
      e.preventDefault();
      $(firstInput).focus();

      // Manage input handling
      $inputs.off('keydown').on('keydown', function(e) {
        var isButton = $(this).is('button'),
            isSelect = $(this).is('select'),
            isElementInNeedOfBlocking = isButton || isSelect;

        // Give the last input a keydown function to return it to document
        if ($(this)[0] === $(lastInput)[0] && e.which === 9) {
          e.preventDefault();
          that.returnFocusToPage.call(that);
          return;
        }

        // If element isn't in need of blocking, just let things happen
        if (!isElementInNeedOfBlocking) { return; }

        // If element is in need of blocking and scroll is unbound, block the key!
        if (e.which === 38 || e.which === 40) {
          e.preventDefault();
          return;
        }
      });

      return this;
    },

    returnFocusToPage: function() {
      if (document.activeElement !== this.imm.$page[0]) {
        this.imm.$page.focus();
      }
    },

    kill: function() {
      this.returnFocusToPage.call(this);
    }

  // End of controller
  ///////////////////////////////////////////////////////
  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    init: function(imm) {
      return new controller[n](this).init(imm);
    },
    tabPress: function(imm, e) {
      return new controller[n](this).tabPress(imm, e);
    },
    kill: function() {
      var c = new controller[n](this);
      c.kill.call(c);
    }
  }

})( jQuery, window , document );

// Component Controller
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////
///////////////////////////////////////////////////////

(function( $, window, document, undefined ) {

  // Setup component registry
  $.Immerse.componentRegistry = {};

  var controller = { name: 'componentController' };

  // Set controller name
  var n = controller.name;
  // Controller constructor
  controller[n] = function() {};
  // Controller prototype
  controller[n].prototype = {

    // Add component to global registry
    ///////////////////////////////////////////////////////

    add: function(opts) {
      var name = opts.name,
          that = this;

      $.Immerse.componentRegistry[name] = opts;

      return this;
    },

    // Extend component defaults into Immerse section defaults
    ///////////////////////////////////////////////////////

    extendDefaults: function(defaults) {
      $.each($.Immerse.componentRegistry, function(name, component) {
        if (component.hasOwnProperty('hasSectionObject') && component.hasSectionObject === true) {
          defaults.components[name] = {};
        }
        if (component.hasOwnProperty('defaults')) {
          defaults.components[name] = component.defaults;
        };
      });

      return defaults;
    },

    // Extend global component options
    ///////////////////////////////////////////////////////

    extendGlobalOptions: function(imm, defaults) {

      var componentSetupOpts = imm.setup.components;

      if (componentSetupOpts !== undefined) {
        $.each($.Immerse.componentRegistry, function(name, component) {
          if (componentSetupOpts.hasOwnProperty(name)) {
            var componentDefaults = defaults.components[name],
                userSettings = componentSetupOpts[name];
            defaults.components[name] = $.extend(true, {}, componentDefaults, userSettings);
          };
        });
      }

      return defaults;
    },

    // Initialize Component on a section
    ///////////////////////////////////////////////////////

    init: function(imm, section) {

      this.imm = imm;

      var that = this;

      this.imm.$page.on('immInit sectionChanged', function(e, d) {

        var opts;

        // Loop over each component

        $.each($.Immerse.componentRegistry, function(name, component) {

          if (e.type === 'immInit') {

            // Init component globally
            if (component.hasOwnProperty('init')) {
              component.init(that.imm);
            }

            // Init component per section
            if (component.hasOwnProperty('initSection')) {
              $.each(that.imm._sections, function(i, s) {
                opts = { immerse: imm, section: s };
                component.initSection(opts);
              });
            }

          // Fire section changed
          } else if (e.type === 'sectionChanged') {

            opts = { immerse: imm, section: d.current };
            if (component.hasOwnProperty('sectionEnter')) {
              component.sectionEnter(opts);
            }

          }
        });

      });

    },

    // Call onResize function of any component
    ///////////////////////////////////////////////////////

    resize: function(imm) {
      if (imm._isTouch) { return false; }
      $.each($.Immerse.componentRegistry, function(name, component) {
        if (component.hasOwnProperty('onResize')) {
          component.onResize(imm);
        }
      });
    },

  // End of controller
  ///////////////////////////////////////////////////////

  };

  // Register with Immerse
  ///////////////////////////////////////////////////////

  $.Immerse[n] = {
    add: function(opts) {
      return new controller[n](this).add(opts);
    },
    extendDefaults: function(defaults) {
      return new controller[n](this).extendDefaults(defaults);
    },
    extendGlobalOptions: function(imm, defaults) {
      return new controller[n](this).extendGlobalOptions(imm, defaults);
    },
    init: function(imm, section) {
      return new controller[n](this).init(imm, section);
    },
    resize: function(imm) {
      return new controller[n](this).resize(imm);
    }
  }

})( jQuery, window , document );

/*
Plugin: Immerse.js
Component: Modals
Description: Adds a modal window to any Immerse section
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'modals',

  // Initialize component
  ///////////////////////////////////////////////////////

  init: function(opts) {

    this.imm = opts.immerse;

    // Ensure all elements are namespaced
    this.modalWrapper = this.imm.utils.namespacify.call(this.imm, 'modal-wrapper');
    this.modalId = this.imm.utils.namespacify.call(this.imm, 'modal-id');
    this.modalIdDataTag = this.imm.utils.datatagify.call(this.imm, this.modalId);
    this.modalOpen = this.imm.utils.namespacify.call(this.imm, 'modal-open');
    this.modalOpenDataTag = this.imm.utils.datatagify.call(this.imm, this.modalOpen);
    this.modalAction = this.imm.utils.namespacify.call(this.imm, 'modal-action');
    this.modalYouTube = this.imm.utils.namespacify.call(this.imm, 'modal-youtube');
    this.pluginName = this.name;

    var section = opts.section,
        $section = $(section.element),
        that = this;

    // Each modal open button
    $.each($section.find(this.modalOpenDataTag), function(i, button) {
      // Prepare button details
      var openStr = $(button).data(that.modalOpen),
          isYoutubeURL = openStr.match(that.youtube.test);

      if (isYoutubeURL) {
        var modalYouTube = that.imm.utils.namespacify.call(that.imm, 'modal-youtube');
        $(button).attr('data-' + modalYouTube, 'true');
        that.youtube.appendModal.call(that, section, button, openStr);
      }
    });

    // On modal open button click
    $(this.modalOpenDataTag, section.element).on('click', function(e) {

      var openModal = that.modalOpen,
          modalYouTube = that.modalYouTube,
          openStr = $(this).attr('data-' + openModal),
          niceId = $.camelCase(openStr),
          openEvent = section.components[that.pluginName][niceId]['onOpen'],
          isYoutubeURL = $(this).attr('data-' + modalYouTube);

      if (isYoutubeURL) {
        that.youtube.open.call(that, openStr);
      } else {
        that.actions.open.call(that, openStr, openEvent);

      }
    });

    // Prepare modal sections
    $.each($section.find(this.modalIdDataTag), function(i, modal) {
      that.prepare.call(that, modal, section);
    });

    // get all .imm-modal-close, .imm-modal-cancel, .imm-modal-confirm buttons
    var allActions = ['close', 'cancel', 'confirm', 'wrapperClick'],
        allButtons = [];

    $.each(allActions, function(i, name) {
      var niceName = name.charAt(0).toUpperCase() + name.slice(1);
      that['modal' + niceName + 'DataTag'] = that.imm.utils.datatagify.call(that.imm, that.modalAction, name);
      allButtons.push(that['modal' + niceName + 'DataTag']);
    });

    // On modal button clicks
    $section.find(allButtons.toString()).on('click', function(e) {
      that.handleBtnClick.call(that, e, this, section);
    });

    return this;
  },

  // Prepare Modal
  ///////////////////////////////////////////////////////

  prepare: function(modal, section) {

    var id = $(modal).data(this.modalId),
        niceId = $.camelCase(id),
        userSettings, extendedSettings,
        modalDefaults = section.components[this.pluginName].default;

    modalDefaults.element = $(this);

    // If no user settings defined, just add our modal defaults
    if (!section.components[this.pluginName].hasOwnProperty(niceId)) {
      section.components[this.pluginName][niceId] = modalDefaults;
    // However, if user has specified in section setup, extend settings over the defaults
    } else {
      userSettings = section.components[this.pluginName][niceId];
      extendedSettings = $.extend({}, modalDefaults, userSettings);
      section.components[this.pluginName][niceId] = extendedSettings;
    }
    // Wrap section
    this.wrap.call(this, modal, id);

    // Fix to add keyboard focus to modal
    $(modal).attr('tabindex', 0);
  },

  // Wrap Modal
  ///////////////////////////////////////////////////////

  wrap: function(modal, id) {
    $wrapper = $('<div class="' + this.modalWrapper + '" data-' + this.modalAction + '="wrapperClick"></div>');
    $(modal).wrap($wrapper);
  },

  // Handle clicks
  ///////////////////////////////////////////////////////

  handleBtnClick: function(e, button, section) {
    // Action type
    var action = $(button).data(this.modalAction);

    // Ensure wrapperClick doesn't fire on modal itself
    if (action === 'wrapperClick' && e.target != button)  { return };

    var actionNiceName = action.charAt(0).toUpperCase() + action.slice(1),
        modal = (action === 'wrapperClick') ? $(button).find(this.modalIdDataTag) : $(button).closest(this.modalIdDataTag),
        id = modal.data(this.modalId),
        niceId = $.camelCase(id);

    $(section.components[this.pluginName][niceId].element).trigger(action);

    var actionObj = section.components[this.pluginName][niceId]['on' + actionNiceName];

    if (actionObj === 'close') {
      this.actions.close.call(this, modal, id);
    } else if ($.isFunction(actionObj)) {
      actionObj(modal);
    }
  },

  youtube: {

    players: [],

    test: '^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$',

    parseId: function(url) {
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,
          match = url.match(regExp);
      if (match&&match[7].length==11){ return match[7]; }
    },

    setupAPI: function() {
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    },

    appendModal: function(section, button, url) {
      var videoId = this.youtube.parseId(url),
          $section = $(section.element),
          that = this;

      $(button).attr('data-' + this.modalOpen, 'youtube-' + videoId);
      var youTubeModal = $('<div data-' + this.modalId + '="youtube-' + videoId + '" data-'+ this.modalYouTube +'="true"><div id="youtube-player-' + videoId + '"></div></div>')
                        .appendTo($section);

      this.youtube.setupAPI();

      window.onYouTubeIframeAPIReady = function() {
        that.youtube.players[videoId] = new YT.Player('youtube-player-' + videoId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          events: {
            'onStateChange': videoStateChange
          }
        });
      }

      function videoStateChange(e) {
        if (e.data == 0) { that.actions.close.call(that, youTubeModal, 'youtube-' + videoId); }
      }

    },

    open: function(openStr) {
      var videoId = openStr.replace('youtube-','');
      this.youtube.players[videoId].playVideo();
      this.actions.open.call(this, openStr);
    },

    close: function(modal, id) {
      var videoId = id.replace('youtube-','');
      this.youtube.players[videoId].stopVideo().seekTo(0, true).stopVideo();
    }
  },

  // Modal actions
  ///////////////////////////////////////////////////////

  actions: {

    open: function(id, openEvent) {
      var $modal = $(this.imm.utils.datatagify.call(this.imm, this.modalId, id));
      if ($modal.length === 0) {
        this.imm.utils.log(this.imm, "Modal Failure: No modal defined with id '" + id + "'"); return;
      }

      if (typeof openEvent === 'function') { openEvent($modal); }

      $modal.closest('.' + this.modalWrapper).addClass('opened');
      $.Immerse.scrollController.htmlScroll(this.imm, 'lock');
      $modal.focus();
    },

    close: function(modal, id) {
      var $modal = $(this.imm.utils.datatagify.call(this.imm, this.modalId, id)),
          $wrapper = $modal.closest('.' + this.modalWrapper).removeClass('opened');

      if ($modal.data(this.modalYouTube) == true) { this.youtube.close.call(this, modal, id); }
      $.Immerse.scrollController.htmlScroll(this.imm, 'unlock');
      this.imm._scrollContainer.focus();
      $modal.scrollTop(0);
    }

  },

  defaults: {
    'default': {
      onConfirm: 'close', onCancel: 'close', onClose: 'close', onEscape: 'close', onWrapperClick: 'close', onOpen: null
    }
  }

});

/*
Plugin: Immerse.js
Component: Modals
Description: Adds a modal window to any Immerse section
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'modals',

  // Initialize component
  ///////////////////////////////////////////////////////

  init: function(imm) {

    this.imm = imm;
    var that = this;

    // Ensure all elements are namespaced
    this.modalsNamespace = this.imm.utils.namespacify.call(this.imm, 'modals');
    this.$modalsContainer = '<div class="' + this.modalsNamespace + '"></div>';
    this.modalWrapper = this.imm.utils.namespacify.call(this.imm, 'modal-wrapper');
    this.modalId = this.imm.utils.namespacify.call(this.imm, 'modal-id');
    this.modalIdDataTag = this.imm.utils.datatagify.call(this.imm, this.modalId);
    this.modalOpen = this.imm.utils.namespacify.call(this.imm, 'modal-open');
    this.modalOpenDataTag = this.imm.utils.datatagify.call(this.imm, this.modalOpen);
    this.modalAnimation = this.imm.utils.namespacify.call(this.imm, 'modal-animation');
    this.modalAction = this.imm.utils.namespacify.call(this.imm, 'modal-action');
    this.modalYouTube = this.imm.utils.namespacify.call(this.imm, 'modal-youtube');
    this.modalSection = this.imm.utils.namespacify.call(this.imm, 'modal-section');
    this.opening = this.imm.utils.namespacify.call(this.imm, 'opening');
    this.opened = this.imm.utils.namespacify.call(this.imm, 'opened');
    this.closing = this.imm.utils.namespacify.call(this.imm, 'closing');
    this.closed = this.imm.utils.namespacify.call(this.imm, 'closed');

    // get all .imm-modal-close, .imm-modal-cancel, .imm-modal-confirm buttons
    this.allActions = ['close', 'cancel', 'confirm', 'wrapperClick'],
    this.allButtons = [];

    $.each(this.allActions, function(i, name) {
      var niceName = name.charAt(0).toUpperCase() + name.slice(1);
      that['modal' + niceName + 'DataTag'] = that.imm.utils.datatagify.call(that.imm, that.modalAction, name);
      that.allButtons.push(that['modal' + niceName + 'DataTag']);
    });

    this.pluginName = this.name;

    // Create modals container
    this.imm.$page.append(this.$modalsContainer);

  },

  // Initialize component on each section
  ///////////////////////////////////////////////////////

  initSection: function(opts) {

    this.imm = opts.immerse;

    var section = opts.section,
        $section = $(section.element),
        that = this;

    // Detect & init youtube modals
    this.youtube.init.call(this, section, $section);

    // On modal open button click
    $(this.modalOpenDataTag, section.element).on('click', function(e) {

      var openModal = that.modalOpen,
          modalYouTube = that.modalYouTube,
          openStr = $(this).attr('data-' + openModal),
          isYoutubeURL = $(this).attr('data-' + modalYouTube);

      if (isYoutubeURL) {
        that.youtube.open.call(that, openStr, section);
      } else {
        that.actions.open.call(that, openStr, section);

      }
    });

    // Prepare modal sections
    $.each($section.find(this.modalIdDataTag), function(i, modal) {
      that.prepare.call(that, modal, section);
    });

    // On modal button clicks
    $(this.allButtons.toString(), '.' + this.modalsNamespace).off().on('click', function(e) {

      // Get the action type
      var action = $(this).data(that.modalAction);

      // Ensure wrapperClick doesn't fire on modal itself
      if (action === 'wrapperClick' && e.target != this)  { return };

      // Get the modal
      var modal = (action === 'wrapperClick') ? $(this).find(that.modalIdDataTag) : $(this).closest(that.modalIdDataTag);

      that.handleClose.call(that, modal, action);

    });


    return this;
  },

  // Prepare Modal
  ///////////////////////////////////////////////////////

  prepare: function(modal, section) {

    var id = $(modal).data(this.modalId),
        isYouTubeModal = $(modal).data(this.modalYouTube) !== undefined,
        niceId = isYouTubeModal ? id : $.camelCase(id),
        userSettings, extendedSettings,
        sectionSettings = section.components[this.pluginName],
        modalDefaults = sectionSettings.default,
        that = this;

    modalDefaults.element = $(modal);

    // If no user settings defined, just add our modal defaults
    if (!sectionSettings.hasOwnProperty(niceId)) {
      sectionSettings[niceId] = modalDefaults;
    // However, if user has specified in section setup, extend settings over the defaults
    } else {
      userSettings = sectionSettings[niceId];
      extendedSettings = $.extend({}, modalDefaults, userSettings);
      sectionSettings[niceId] = extendedSettings;
    }

    // If close transition defined but no other default closing transition defined, use the close transition
    if (sectionSettings[niceId]['transitions'].hasOwnProperty('close')) {
      var closeAnim = sectionSettings[niceId]['transitions']['close'],
          allActions = $.merge([], that.allActions);

      // If it's a YouTube modal add videoEnd action
      if (isYouTubeModal) { allActions.push('videoEnd'); }

      $.each(allActions, function(i, action) {
        if (sectionSettings[niceId]['transitions'].hasOwnProperty(action)) { return; }
        sectionSettings[niceId]['transitions'][action] = closeAnim;
      });
    }

    // Add reference to section
    $(modal).attr('data-' + this.modalSection, $.camelCase(section.id));

    // Move modal to wrapper
    $(modal).appendTo('.' + this.modalsNamespace);

    // Wrap section
    this.wrap.call(this, modal, id);

    // Fix to add keyboard focus to modal
    $(modal).attr('tabindex', 0);
  },

  // Wrap Modal
  ///////////////////////////////////////////////////////

  wrap: function(modal, id) {
    var data = 'class="' + this.modalWrapper + '"',
        data = data + ' data-' + this.modalAction + '="wrapperClick"';

    var $wrapper = $('<div ' + data + '></div>');
    $(modal).wrap($wrapper);
  },

  // Handle close
  ///////////////////////////////////////////////////////

  handleClose: function(modal, action) {

    // Don't want references to button in here

    var actionNiceName = action.charAt(0).toUpperCase() + action.slice(1)
        id = modal.data(this.modalId),
        isYouTubeModal = $(modal).data(this.modalYouTube) !== undefined,
        niceId = isYouTubeModal ? id : $.camelCase(id),
        sectionId = modal.data(this.modalSection),
        section = this.imm._sections.filter(function(s) { return s.id === sectionId; }),
        section = section[0],
        modalSettings = section.components[this.pluginName][niceId];

    $(modalSettings.element).trigger(action);

    var actionsObj = modalSettings.actions;

    if (actionsObj.hasOwnProperty(action)
        && $.isFunction(actionsObj[action])) {

      actionsObj[action](modal);

    } else {
      this.actions.close.call(this, modal, id, modalSettings.transitions, action);
    }
  },

  // YouTube
  ///////////////////////////////////////////////////////

  youtube: {

    players: [],

    init: function(section, $section) {

      var that = this;

      $.each($section.find(this.modalOpenDataTag), function(i, button) {
        // Prepare button details
        var openStr = $(button).data(that.modalOpen),
            isYoutubeURL = openStr.match(that.youtube.test);

        // If it is a Youtube URL
        if (isYoutubeURL) {
          var modalYouTube = that.imm.utils.namespacify.call(that.imm, 'modal-youtube');
          $(button).attr('data-' + modalYouTube, 'true');
          that.youtube.appendModal.call(that, section, button, openStr);
        }
      });

    },

    test: '^(https?\:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$',

    parseId: function(url) {
      var regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*/,
          match = url.match(regExp);
      if (match&&match[7].length==11){ return match[7]; }
    },

    setupAPI: function() {
      var tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    },

    appendModal: function(section, button, url) {
      var videoId = this.youtube.parseId(url),
          $section = $(section.element),
          that = this;

      $(button).attr('data-' + this.modalOpen, 'youtube-' + videoId);
      var youTubeModal = $('<div data-' + this.modalId + '="youtube-' + videoId + '" data-'+ this.modalYouTube +'="true"><div id="youtube-player-' + videoId + '"></div></div>')
                        .appendTo($section);

      this.youtube.setupAPI();

      window.onYouTubeIframeAPIReady = function() {
        that.youtube.players[videoId] = new YT.Player('youtube-player-' + videoId, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          events: {
            'onStateChange': videoStateChange
          }
        });
      }

      function videoStateChange(e) {
        if (e.data == 0) {
          that.handleClose.call(that, youTubeModal, 'videoEnd');
        }
      }

    },

    open: function(openStr, section) {
      var videoId = openStr.replace('youtube-','');
      this.youtube.players[videoId].playVideo();
      this.actions.open.call(this, openStr, section);
    },

    close: function(modal, id) {
      var videoId = id.replace('youtube-','');
      this.youtube.players[videoId].stopVideo().seekTo(0, true).stopVideo();
    }
  },

  // Modal actions
  ///////////////////////////////////////////////////////

  actions: {

    // Open
    ///////////////////////////////////////////////////////

    open: function(id, section) {
      var $modal = $(this.imm.utils.datatagify.call(this.imm, this.modalId, id)),
          that = this;

      if ($modal.length === 0) {
        this.imm.utils.log(this.imm, "Modal Failure: No modal defined with id '" + id + "'"); return;
      }

      var $modalWrapper = $modal.closest('.' + this.modalWrapper),
          isYouTubeModal = $modal.data(this.modalYouTube) !== undefined,
          niceId = isYouTubeModal ? id : $.camelCase(id),
          modalSettings = section.components[this.pluginName][niceId],
          openEvent = modalSettings.actions.open;

      if (typeof openEvent === 'function') { openEvent($modal); }

      var transition = this.getTransition(modalSettings.transitions, 'open');

      $.Immerse.scrollController.htmlScroll(this.imm, 'lock');

      if (transition === null) {
        $modalWrapper.addClass(that.opened);
        $modal.focus();

      } else {

        $modalWrapper.addClass(this.opening + ' ' + transition.animation + ' ' + transition.speed);
        $modal
          .off(this.imm.utils.cssAnimationEvents)
          .one(this.imm.utils.cssAnimationEvents, function(e) {
            $modalWrapper.removeClass(that.opening + ' ' + transition.animation + ' ' + transition.speed);
            $modalWrapper.addClass(that.opened);
            $modal.focus();
          });

      }

    },

    // Close
    ///////////////////////////////////////////////////////

    close: function(modal, id, t, action) {

      var $modal = $(modal),
          $modalWrapper = $modal.closest('.' + this.modalWrapper),
          isYouTubeModal = $modal.data(this.modalYouTube) !== undefined,
          that = this;

      var transition = this.getTransition(t, action);

      if (transition === null) {
        $modalWrapper.removeClass(this.open);
        $modal.focus();
        if (isYouTubeModal) { this.youtube.close.call(this, modal, id); }
        $.Immerse.scrollController.htmlScroll(this.imm, 'unlock');
        that.imm._scrollContainer.focus();
        $modal.scrollTop(0);

      } else {

        $modalWrapper.removeClass(this.open).addClass(this.closing + ' ' + transition.animation + ' ' + transition.speed);
        $modal
          .off(this.imm.utils.cssAnimationEvents)
          .one(this.imm.utils.cssAnimationEvents, function(e) {
            $modalWrapper.removeClass(that.opened + ' ' + that.closing + ' ' + transition.animation + ' ' + transition.speed);
            $modal.focus();
            if (isYouTubeModal) { that.youtube.close.call(that, modal, id); }
            $.Immerse.scrollController.htmlScroll(that.imm, 'unlock');
            that.imm._scrollContainer.focus();
            $modal.scrollTop(0);
          });

      }

    }

  },

  // Get Animations
  ///////////////////////////////////////////////////////

  getTransition: function(t, type) {

    var hasTransition = (typeof t === 'object' || typeof t === 'string' && t.hasOwnProperty(type));

    if (hasTransition) {

      if (typeof t[type] === 'string') {
        return {
          animation: t[type], speed: 'normal', blur: false
        };

      } else if (typeof t[type] === 'object') {
        return t[type];

      }

    } else {
      return null;
    }
  },

  // Set the defaults for the plugin

  defaults: {
    'default': {
      animations: {},
      actions: {}
    }
  }

});

/*
Plugin: Immerse.js
Component: ScrollTo
Description: Easily enables sections to be scrolled to from buttons containing the -scroll-to class
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'scroll-to',

  // Initialize function
  init: function(imm) {
    this.imm = imm;
    this.scrollToNamespace = this.imm.utils.namespacify.call(this.imm, 'scroll-to');
    this.scrollToDataTag = this.imm.utils.datatagify.call(this.imm, this.scrollToNamespace);

    var that = this;

    // On any click of a scroll-to button

    $(this.scrollToDataTag).on('click', function(e) {
      var $button = $(this),
          target = $button.data(that.scrollToNamespace);

      if (typeof target === 'string') { $.Immerse.scrollController.doScroll(that.imm, target); }
    });

    return this;
  }

});

/*
Plugin: Immerse.js
Component: Sliders
Description: Adds a slider to any Immerse section
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'sliders',

  // Initialize function
  init: function(opts) {
    var section = opts.section,
        $section = $(section.element),
        that = this;

    // Choose whether to build own slider or use iDangerous swiper.

    return this;
  }

});

/*
Plugin: Immerse.js
Component: Stacks
Description: Adds a stack of content to any Immerse section
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'stacks',

  // Initialize function
  init: function(opts) {
    var section = opts.section,
        $section = $(section.element),
        that = this;

    // Content which slides out the section content and reveals more content with a back button to go back to the current content.

    // Firstly need to wrap the section content in a div which can slide out

    // Secondly need to hide the stack content

    // Thirdly need some kind of animation to fire on a button press

    // Fouthly need to enable native scrolling on the section.

    // Fifthly need to fire another animation to take you back to the content

    return this;
  },

  defaults: {
    option1: true

  }

});

/*
Plugin: Immerse.js
Component: Tooltips
Description: Adds tooltips to any element with -tooltip class
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'tooltips',

  // Initialize function
  initSection: function(opts) {
    this.imm = opts.immerse;
    this.tooltipClass = this.imm.utils.namespacify.call(this.imm, 'tooltip');
    this.tooltipContentClass = this.imm.utils.namespacify.call(this.imm, 'tooltip-content');

    var section = opts.section,
        $section = $(section.element),
        that = this;

    // Get each tooltip in section
    $.each($section.find('[data-' + this.tooltipClass + ']'), function(i, tooltip) {

      var $tooltip = $(tooltip),
          content = $tooltip.data(that.tooltipClass);

      if (content.charAt(0) === '#') {
        var tooltipContentDiv = $(that.imm.utils.datatagify.call(that.imm, that.tooltipContentClass, content.replace('#', '')));
        content = tooltipContentDiv;
      }

      content = (content.jquery) ? $(content).html() : content;

      // Append correct tooltip content
      var $content = $('<span class="' + that.tooltipClass + '">' + content + '</span>');
      $tooltip.append($content);

      $tooltip.on('mouseover', function() {
        that.position.call(that, $tooltip, $content);
      });
    });

    return this;
  },

  // Position Tooltip
  position: function($tooltip, $content) {

    $content.removeClass('top left right bottom');
    var tHeight = $content.height(),
        tWidth = $content.width(),
        tXY = $tooltip[0].getBoundingClientRect(),
        p = 'top';
    if (tHeight >= tXY.top) { p = 'bottom'; }
    if (tWidth/2 >= tXY.left) {
      p = 'right';
    } else if (tWidth/2 >= $(window).width() - tXY.right) {
      p = 'left';
    }
    $content.addClass(p);
  }

});

/*
Plugin: Immerse.js
Component: Videos
Description: Adds video backgrounds to any element with -video class and data tag
Version: 1.0.0
Author: Will Viles
Author URI: http://vil.es/
*/

new Immerse().component({
  name: 'videos',

  // Initialize function
  initSection: function(opts) {
    this.imm = opts.immerse;
    this.videoNamespace = this.imm.utils.namespacify.call(this.imm, 'video');

    var section = opts.section,
        $section = $(section.element),
        that = this;

    var sectionVideos = $section.find('[data-' + this.videoNamespace + ']');
    $.each(sectionVideos, function(i, wrapper) {

      var videoName = $(wrapper).data(that.videoNamespace);

      if (that.imm.setup.hasOwnProperty('assets')) {
        if (!that.imm.setup.assets.hasOwnProperty(videoName)) {
          that.imm.utils.log(that.imm, "Asset Failure: Could not initialize video asset '" + videoName + "'"); return;
        }
      } else {
        that.imm.utils.log(that.imm, "Asset Failure: Could not initialize video asset '" + videoName + "'"); return;
      }

      // If asset matches, initialize the video
      that.handler.call(that, opts.immerse, section, wrapper);
    });

    return this;
  },

  // Initialize
  ///////////////////////////////////////////////////////
  handler: function(imm, s, wrapper) {

    // Get a handle on the Immerse object
    this.imm = imm;

    var $wrapper = $(wrapper),
        $video = $wrapper.find('video'),
        $s = $(s.element),
        that = this;

    if (this.imm._isTouch) { $video.hide(); return false; }

    // On entering scene & resize the video
    $s.on('init enteringDown enteringUp', function(e) {

      if (e.type === 'init' && s.element !== that.imm._currentSection.element) { return; };

      $video
        .css({visibility: 'hidden'})
        .one('canplaythrough', function() {
          that.doResize(wrapper);
        })
        .one('playing', function() {
          $video.css('visibility', 'visible');
          $wrapper.css('background-image', 'none');
        });

      if ($video[0].paused) {
        $video[0].play();
        // Just ensure it's the right size once and for all
        that.doResize(wrapper);
      }

    });

    $s.on('exitedDown exitedUp', function() {
      if (!$video[0].paused) {
        $video[0].pause();
        $video[0].currentTime = 0;
      }

    });


    return this;
  },

  onResize: function(imm) {
    var that = this;
    $.each(imm.$page.find('[data-' + this.videoDataTag + ']'), function(i, wrapper) {
      that.doResize(wrapper);
    });

  },

  doResize: function(wrapper) {
    // Get video elem
    var $wrapper = $(wrapper),
        $video = $wrapper.find('video'),
        videoHeight = $video[0].videoHeight, // Get native video height
        videoWidth = $video[0].videoWidth, // Get native video width
        wrapperHeight = $wrapper.height(), // Wrapper height
        wrapperWidth = $wrapper.width(); // Wrapper width

    if (wrapperWidth / videoWidth > wrapperHeight / videoHeight) {
      $video.css({ width: wrapperWidth + 2, height: 'auto'});
    } else {
      $video.css({ width: 'auto', height: wrapperHeight + 2 });
    }

  },

  defaults: {
    value: true
  }
});
//# sourceMappingURL=immerse.js.map