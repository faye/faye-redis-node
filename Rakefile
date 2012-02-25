require 'fileutils'

task :prepare do
  `git submodule update --init --recursive`
  `gem install jake`
  FileUtils.cd 'vendor/faye' do
    `npm install`
    `jake`
  end
  `npm install`
end

task :default => :prepare

