require 'fileutils'

task :prepare do
  `git submodule update --init --recursive`
  FileUtils.cd 'vendor/faye' do
    `npm install`
    `jake`
  end
  FileUtils.cd 'vendor/js.class' do
    `jake`
  end
  `npm install`
end

task :default => :prepare
