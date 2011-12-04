require 'fileutils'

task :prepare do
  `git submodule update --init --recursive`
  FileUtils.cd 'vendor/faye' do
    `npm install`
    `jake`
  end
  `npm install`
end

task :default => :prepare
