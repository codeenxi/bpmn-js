module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);

  /* global Buffer,process*/

  // configures browsers to run test against
  // any of [ 'PhantomJS', 'Chrome', 'Firefox', 'IE']
  var TEST_BROWSERS = ((process.env.TEST_BROWSERS || '').replace(/^\s+|\s+$/, '') || 'PhantomJS').split(/\s*,\s*/g);

  function bundleAlias(components) {

    var alias = [];

    if (components.indexOf('libs-external') >= 0) {
      alias.push('node_modules/jquery:jquery');
      alias.push('node_modules/lodash:lodash');
    }

    if (components.indexOf('libs-local') >= 0) {
      alias.push('node_modules/bpmn-moddle:bpmn-moddle');
    }

    if (components.indexOf('viewer') >= 0) {
      alias.push('index.js:bpmn-js');
      alias.push('<%= config.sources %>/Viewer.js:bpmn-js/Viewer');
    }

    if (components.indexOf('modeler') >= 0) {
      alias.push('<%= config.sources %>/Modeler.js:bpmn-js/Modeler');
    }

    return alias;
  }

  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    config: {
      sources: 'lib',
      tests: 'test',
      dist: 'dist',
      samples: 'example'
    },

    jshint: {
      src: [
        ['<%=config.sources %>']
      ],
      gruntfile: [
        'Gruntfile.js'
      ],
      options: {
        jshintrc: true
      }
    },

    release: {
      options: {
        tagName: 'v<%= version %>',
        commitMessage: 'chore(project): release v<%= version %>',
        tagMessage: 'chore(project): tag v<%= version %>'
      }
    },

    jasmine_node: {
      options: {
        specNameMatcher: '.*Spec',
        jUnit: {
          report: true,
          savePath : 'tmp/reports/jasmine',
          useDotNotation: true,
          consolidate: true
        }
      },
      node: [ 'test/spec/node/' ]
    },

    karma: {
      options: {
        configFile: '<%= config.tests %>/config/karma.unit.js',
      },
      single: {
        singleRun: true,
        autoWatch: false,

        browsers: TEST_BROWSERS,

        browserify: {
          debug: false,
          transform: [ 'brfs' ]
        }
      },
      unit: {
        browsers: TEST_BROWSERS,
        browserify: {
          transform: [ 'brfs' ]
        }
      }
    },

    browserify: {
      options: {
        browserifyOptions: {
          builtins: false
        },
        bundleOptions: {
          detectGlobals: false,
          insertGlobalVars: [],
          debug: true
        }
      },
      watch: {
        files: {
          '<%= config.dist %>/bpmn.js': [ '<%= config.sources %>/**/*.js' ],
          '<%= config.dist %>/bpmn-viewer.js': [ '<%= config.sources %>/lib/Viewer.js' ]
        },
        options: {
          watch: true,
          alias: bundleAlias([
            'viewer',
            'modeler',
            'libs-external',
            'libs-local'
          ])
        }
      },
      bowerViewer: {
        files: {
          '../bower-bpmn-js/bpmn-viewer.js': [ '<%= config.sources %>/lib/Viewer.js' ]
        },
        options: {
          bundleOptions: {
            detectGlobals: false,
            insertGlobalVars: [],
            debug: false
          },
          transform: [
            [ 'exposify', {
              expose: {
                sax: 'sax',
                snapsvg: 'Snap',
                lodash: '_',
                jquery: '$',
                'jquery-mousewheel': '$'
              }
            } ]
          ],
          alias: bundleAlias([
            'viewer',
            'libs-local'
          ])
        }
      },
      standaloneViewer: {
        files: {
          '<%= config.dist %>/bpmn-viewer.js': [ '<%= config.sources %>/lib/Viewer.js' ]
        },
        options: {
          alias: bundleAlias([
            'viewer',
            'libs-external',
            'libs-local'
          ])
        }
      },
      standaloneModeler: {
        files: {
          '<%= config.dist %>/bpmn.js': [ '<%= config.sources %>/**/*.js' ],
        },
        options: {
          alias: bundleAlias([
            'viewer',
            'modeler',
            'libs-external',
            'libs-local'
          ])
        }
      }
    },

    copy: {
      samples: {
        files: [
          // copy sample files
          {
            expand: true,
            cwd: '<%= config.samples %>/',
            src: ['**/*.*'],
            dest: '<%= config.dist %>/<%= config.samples %>'
          }
        ]
      }
    },

    watch: {
      samples: {
        files: [ '<%= config.samples %>/**/*.*' ],
        tasks: [ 'build:samples' ]
      },
      jasmine_node: {
        files: [ '<%= config.sources %>/**/*.js', '<%= config.tests %>/spec/node/**/*.js' ],
        tasks: [ 'jasmine_node' ]
      },
      modeler: {
        files: [ '<%= config.dist %>/bpmn.js' ],
        tasks: [ 'uglify:modeler' ]
      },
      viewer: {
        files: [ '<%= config.dist %>/bpmn-viewer.js' ],
        tasks: [ 'uglify:viewer' ]
      }
    },

    jsdoc: {
      dist: {
        src: [ '<%= config.sources %>/**/*.js' ],
        options: {
          destination: 'docs/api',
          plugins: [ 'plugins/markdown' ]
        }
      }
    },

    connect: {
      options: {
        port: 9003,
        livereload: 35726,
        hostname: 'localhost'
      },
      livereload: {
        options: {
          open: true,
          base: [
            '<%= config.dist %>'
          ]
        }
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %> - ' +
                'http://bpmn.io/license - ' +
                'https://github.com/bpmn-io/bpmn-js */',
        sourceMap: true,
        sourceMapIncludeSources: true,
        sourceMapIn: function(file) {
          var content = grunt.file.read(file, { encoding: 'utf-8' });

          var match = /\/\/# sourceMappingURL=data:application\/json;base64,(.*)/.exec(content);

          if (match) {
            var b = new Buffer(match[1] + '==', 'base64');
            var s = b.toString();

            grunt.file.write('tmp/sourceMap.json', s, { encoding: 'utf-8' });

            return 'tmp/sourceMap.json';
          } else {
            return null;
          }
        }
      },
      modeler: {
        files: {
          '<%= config.dist %>/bpmn.min.js': [ '<%= config.dist %>/bpmn.js' ]
        }
      },
      viewer: {
        files: {
          '<%= config.dist %>/bpmn-viewer.min.js': [ '<%= config.dist %>/bpmn-viewer.js' ]
        }
      }
    }
  });

  // tasks

  grunt.registerTask('test', [ 'jasmine_node', 'karma:single' ]);

  grunt.registerTask('build', function(target, mode) {

    mode = mode || 'prod';

    if (target === 'lib') {
      var tasks = [];

      if (mode !== 'dev') {
        tasks.push('uglify:modeler', 'uglify:viewer');
      }

      return grunt.task.run(['browserify:standaloneViewer', 'browserify:standaloneModeler'].concat(tasks));
    }

    if (target === 'samples') {
      return grunt.task.run(['copy:samples']);
    }

    if (!target || target === 'all') {
      return grunt.task.run(['build:lib:' + mode, 'build:samples:' + mode]);
    }
  });

  grunt.registerTask('auto-build', [
    'browserify:watch',
    'connect:livereload',
    'watch'
  ]);

  grunt.registerTask('auto-test', [ 'karma:unit' ]);

  grunt.registerTask('default', [ 'jshint', 'test', 'build', 'jsdoc' ]);
};