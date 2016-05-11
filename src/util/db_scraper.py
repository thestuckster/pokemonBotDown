""" Python scraper to grab and construct a json for pokemon moves.
    URL: http://pokemondb.net/move/all
    Author: Stephen
    Date: 5.10.2016
"""

import requests
import json
from BeautifulSoup import BeautifulSoup


def main():
        URL = 'http://pokemondb.net/move/all'
        html = requests.get(URL).content

        soup = BeautifulSoup(html)
        move_table = soup.find('tbody').findAll('tr')

        moves = build_moves_dic(move_table)

        record(moves)


def build_moves_dic(table):
    moves = {}

    for row in table:
        name_link = row.find('td', attrs = {'class': 'cell-icon-string'}).find('a')
        name = name_link.string
        power = row.findAll('td', attrs = {'class': 'num'})[0].string

        moves[name] = power

    return moves


def record(moves):
    movefile = open('moveList.json', 'w')
    #file.write("moveList = {")

#    for key, val in moves.iteritems():
    #    if val == "-":
    #        val = "null"

    #    line = "'" + key + "'" + ": " + val + ",\n"
    #    file.write(line)

    #file.write("}")

    json.dump(moves, movefile)
    movefile.close()

if __name__ == "__main__":
    main()
else:
    print "This is not a library!"
