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