module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		react: {
			options: {
				harmony: true
			},
			all: {
				files: {'typs-transpiled.js' : 'typs.js'},
			}
		}
	});

	grunt.loadNpmTasks('grunt-react');

	grunt.registerTask('default', ['react']);
};
