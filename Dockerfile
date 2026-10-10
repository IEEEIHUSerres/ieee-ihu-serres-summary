# Build: docker build -t iordaniskostelidis/ieee-ihu-serres-summary:local .
# Run: docker run -it --rm -p 80:80 iordaniskostelidis/ieee-ihu-serres-summary:local
FROM httpd:2.4.69-alpine3.24
LABEL MAINTAINER="Iordanis Kostelidis <kostelidis@ieee.org>"

COPY . /usr/local/apache2/htdocs/
